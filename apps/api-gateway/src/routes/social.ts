import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const followParamsSchema = z.object({
  params: z.object({
    username: z.string().min(3).max(30),
  }),
});

const feedQuerySchema = z.object({
  querystring: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});

const activityQuerySchema = z.object({
  querystring: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});

async function getUserIdByUsername(fastify: any, username: string): Promise<string | null> {
  const cached = await fastify.redis.get(`user:username:${username}`);
  return cached || null;
}

async function emitActivity(fastify: any, userId: string, type: string, metadata: any) {
  const activityId = uuidv4();
  const activity = {
    id: uuidv4(),
    userId,
    type,
    metadata,
    createdAt: new Date().toISOString(),
  };

  await fastify.redis.zAdd(`user:${userId}:activities`, { score: Date.now(), value: JSON.stringify(activity) });
  await fastify.redis.zAdd("global:activities", { score: Date.now(), value: JSON.stringify(activity) });
  await fastify.redis.zRemRangeByRank(`user:${userId}:activities`, 0, -1001);
  await fastify.redis.zRemRangeByRank("global:activities", 0, -1001);

  // Push to followers' feeds
  const followers = await fastify.redis.sMembers(`user:${userId}:followers`);
  for (const followerId of followers) {
    await fastify.redis.zAdd(`feed:${followerId}`, { score: Date.now(), value: JSON.stringify(activity) });
    await fastify.redis.zRemRangeByRank(`feed:${followerId}`, 0, -501); // Keep last 500
  }
}

export const socialRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /users/:username/follow - Follow/Unfollow user
  fastify.post("/users/:username/follow", {
    preHandler: [fastify.authenticate, fastify.rateLimit.mutation],
    schema: { params: followParamsSchema.shape.params },
  }, async (request, reply) => {
    const currentUserId = request.user!.sub;
    const { username } = request.params;

    // Get target user ID
    const targetUserId = await getUserIdByUsername(fastify, username);
    if (!targetUserId) {
      return reply.code(404).send({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User not found", requestId: request.requestId },
      });
    }

    if (targetUserId === currentUserId) {
      return reply.code(400).send({
        success: false,
        error: { code: "SELF_FOLLOW", message: "Cannot follow yourself", requestId: request.requestId },
      });
    }

    const followingKey = `user:${currentUserId}:following`;
    const followersKey = `user:${targetUserId}:followers`;

    const isFollowing = await fastify.redis.sIsMember(followingKey, targetUserId);

    if (isFollowing) {
      // Unfollow
      await Promise.all([
        fastify.redis.sRem(followingKey, targetUserId),
        fastify.redis.sRem(`user:${targetUserId}:followers`, currentUserId),
      ]);
      await fastify.redis.decr(`user:${currentUserId}:stats:following_count`);
      await fastify.redis.decr(`user:${targetUserId}:stats:followers_count`);

      return { success: true, data: { following: false, message: "Unfollowed successfully" } };
    } else {
      // Follow
      await Promise.all([
        fastify.redis.sAdd(followingKey, targetUserId),
        fastify.redis.sAdd(`user:${targetUserId}:followers`, currentUserId),
      ]);
      await fastify.redis.incr(`user:${currentUserId}:stats:following_count`);
      await fastify.redis.incr(`user:${targetUserId}:stats:followers_count`);

      // Emit activity
      await emitActivity(fastify, currentUserId, "followed", { targetUserId, targetUsername: username });

      return { success: true, data: { following: true, message: "Followed successfully" } };
    }
  });

  // GET /feed - Get personalized feed
  fastify.get("/feed", {
    preHandler: [fastify.authenticate, fastify.rateLimit.user.feed],
    schema: { querystring: feedQuerySchema.shape.querystring },
  }, async (request, reply) => {
    const userId = request.user!.sub;
    const { page, limit } = request.query;

    const feedKey = `feed:${userId}`;
    const activities = await fastify.redis.zRevRange(feedKey, (page - 1) * limit, page * limit - 1);
    
    const parsed = activities.map(a => JSON.parse(a));
    
    // Enrich with user data
    const enriched = await Promise.all(parsed.map(async (activity: any) => {
      const userData = await fastify.redis.hGetAll(`user:id:${activity.userId}`);
      return {
        ...activity,
        user: userData.id ? {
          id: userData.id,
          username: userData.username,
          displayName: userData.displayName,
          avatarUrl: userData.avatarUrl || null,
        } : null,
      };
    }));

    return {
      success: true,
      data: enriched,
      meta: { page, limit, total: await fastify.redis.zCard(feedKey) },
    });
  });

  // GET /users/:username/activity - Get user activity
  fastify.get("/users/:username/activity", {
    preHandler: [fastify.authenticate, fastify.requirePrivacy("public")],
    schema: { 
      params: followParamsSchema.shape.params,
      querystring: activityQuerySchema.shape.querystring,
    },
  }, async (request, reply) => {
    const { page, limit } = request.query;
    const targetUserId = await getUserIdByUsername(fastify, request.params.username);

    if (!targetUserId) {
      return reply.code(404).send({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User not found", requestId: request.requestId },
      });
    }

    const activities = await fastify.redis.zRevRange(
      `user:${targetUserId}:activities`,
      (page - 1) * limit,
      page * limit - 1
    );

    const parsed = activities.map(a => JSON.parse(a));

    return {
      success: true,
      data: parsed,
      meta: { page, limit, total: await fastify.redis.zCard(`user:${targetUserId}:activities`) },
    });
  });

  // GET /users/:username/followers
  fastify.get("/users/:username/followers", {
    preHandler: [fastify.authenticate, fastify.requirePrivacy("public")],
    schema: { 
      params: followParamsSchema.shape.params,
      querystring: z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().positive().max(50).default(20) }),
    },
  }, async (request, reply) => {
    const { page, limit } = request.query;
    const targetUserId = await getUserIdByUsername(fastify, request.params.username);

    if (!targetUserId) {
      return reply.code(404).send({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User not found", requestId: request.requestId },
      });
    }

    const followers = await fastify.redis.sMembers(`user:${targetUserId}:followers`);
    const paginated = followers.slice((page - 1) * limit, page * limit);

    const users = await Promise.all(paginated.map(async (followerId: string) => {
      const user = await fastify.redis.hGetAll(`user:id:${followerId}`);
      return user.id ? {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl || null,
      } : null;
    }));

    return {
      success: true,
      data: users.filter(Boolean),
      meta: { page, limit, total: followers.length },
    };
  });

  // GET /users/:username/following
  fastify.get("/users/:username/following", {
    preHandler: [fastify.authenticate, fastify.requirePrivacy("public")],
    schema: { 
      params: followParamsSchema.shape.params,
      querystring: z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().positive().max(50).default(20) }),
    },
  }, async (request, reply) => {
    const { page, limit } = request.query;
    const targetUserId = await getUserIdByUsername(fastify, request.params.username);

    if (!targetUserId) {
      return reply.code(404).send({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User not found", requestId: request.requestId },
      });
    }

    const following = await fastify.redis.sMembers(`user:${targetUserId}:following`);
    const paginated = following.slice((page - 1) * limit, page * limit);

    const users = await Promise.all(paginated.map(async (followingId: string) => {
      const user = await fastify.redis.hGetAll(`user:id:${followingId}`);
      return user.id ? {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl || null,
      } : null;
    }));

    return {
      success: true,
      data: users.filter(Boolean),
      meta: { page, limit, total: following.length },
    };
  });

  // GET /users/:username/reading - Get public reading list
  fastify.get("/users/:username/reading", {
    preHandler: [fastify.authenticate, fastify.requirePrivacy("public")],
    schema: { 
      params: followParamsSchema.shape.params,
      querystring: z.object({ 
        status: z.enum(["reading", "want_to_read", "finished", "dropped", "on_hold", "all"]).default("all"),
        workType: z.enum(["book", "manga", "all"]).default("all"),
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(50).default(20),
      }),
    },
  }, async (request, reply) => {
    const { status, workType, page, limit } = request.query;
    const targetUserId = await getUserIdByUsername(fastify, request.params.username);

    if (!targetUserId) {
      return reply.code(404).send({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User not found", requestId: request.requestId },
      });
    }

    // Get all list items
    const allItems = await fastify.redis.zRange(`user:${targetUserId}:reading_list`, 0, -1);
    let items = allItems.map(item => JSON.parse(item));

    // Filter by status
    if (status !== "all") items = items.filter((i: any) => i.status === status);
    if (workType !== "all") items = items.filter((i: any) => i.workType === workType);

    // Filter public only
    items = items.filter((i: any) => i.isPublic);

    // Enrich with work data
    const enriched = await Promise.all(items.map(async (item: any) => {
      const workCacheKey = `${item.workType === "book" ? "book" : "manga"}:${item.workId}`;
      let work = await fastify.redis.get(workCacheKey);
      if (work) work = JSON.parse(work);
      return { ...item, work };
    }));

    const total = enriched.length;
    const paginated = enriched.slice((page - 1) * limit, page * limit);

    return {
      success: true,
      data: paginated,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 },
    };
  });
};
