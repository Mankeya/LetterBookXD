import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { ReadingPrivacy } from "@letterbookxd/shared-types";

const userParamsSchema = z.object({
  params: z.object({
    username: z.string().min(3).max(30),
  }),
});

const usersQuerySchema = z.object({
  querystring: z.object({
    q: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});

async function getUserIdByUsername(fastify: any, username: string): Promise<string | null> {
  return await fastify.redis.get(`user:username:${username}`);
}

function sanitizeUser(user: any, isOwnProfile: boolean, isFollowing: boolean, privacy: ReadingPrivacy): any {
  // Always show basic info
  const sanitized: any = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl || null,
    bio: user.bio || null,
    createdAt: user.createdAt,
    stats: {
      booksRead: parseInt(user.statsBooksRead || "0"),
      mangaRead: parseInt(user.statsMangaRead || "0"),
      totalPagesRead: parseInt(user.statsTotalPagesRead || "0"),
      totalChaptersRead: parseInt(user.statsTotalChaptersRead || "0"),
      followersCount: parseInt(user.statsFollowersCount || "0"),
      followingCount: parseInt(user.statsFollowingCount || "0"),
      readingListsCount: parseInt(user.statsReadingListsCount || "0"),
    },
  };

  // Email only for own profile
  if (isOwnProfile) {
    sanitized.email = user.email;
    sanitized.readingPrivacy = user.readingPrivacy;
    sanitized.readingLanguage = JSON.parse(user.readingLanguage || "[]");
  }

  // Reading list visibility based on privacy
  const canSeeReadingList = isOwnProfile || privacy === "public" || (privacy === "followers" && isFollowing);
  if (!canSeeReadingList) {
    sanitized.readingListHidden = true;
  }

  return sanitized;
}

export const usersRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /users - Search users
  fastify.get("/", {
    preHandler: [fastify.authenticate],
    schema: { querystring: usersQuerySchema.shape.querystring },
  }, async (request, reply) => {
    const { q, page, limit } = request.query;

    // In production, use a proper search index
    // For now, scan all users (not scalable)
    const allUsers = await fastify.redis.sMembers("users:all");
    let users: any[] = [];

    for (const userId of allUsers) {
      const user = await fastify.redis.hGetAll(`user:id:${userId}`);
      if (user.id && (!q || user.username.toLowerCase().includes(q.toLowerCase()) || user.displayName.toLowerCase().includes(q.toLowerCase()))) {
        users.push(user);
      }
    }

    const total = users.length;
    const paginated = users.slice((page - 1) * limit, page * limit);

    const sanitized = paginated.map((user: any) => sanitizeUser(user, false, false, "public"));

    return {
      success: true,
      data: sanitized,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 },
    };
  });

  // GET /users/:username - Get user profile
  fastify.get("/:username", {
    preHandler: [fastify.authenticate, fastify.requirePrivacy("public")],
    schema: { params: userParamsSchema.shape.params },
  }, async (request, reply) => {
    const { username } = request.params;
    const currentUserId = request.user!.sub;

    const targetUserId = await fastify.redis.get(`user:username:${username}`);
    if (!targetUserId) {
      return reply.code(404).send({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User not found", requestId: request.requestId },
      });
    }

    const isOwnProfile = targetUserId === currentUserId;
    const isFollowing = await fastify.redis.sIsMember(`user:${currentUserId}:following`, targetUserId);
    const targetUser = await fastify.redis.hGetAll(`user:id:${targetUserId}`);

    if (!targetUser.id) {
      return reply.code(404).send({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User not found", requestId: request.requestId },
      });
    }

    // Compute stats
    const stats = {
      booksRead: await fastify.redis.sCard(`user:${targetUserId}:books:finished`),
      mangaRead: await fastify.redis.sCard(`user:${targetUserId}:manga:finished`),
      totalPagesRead: 0, // Would aggregate
      totalChaptersRead: 0,
      followersCount: await fastify.redis.sCard(`user:${targetUserId}:followers`),
      followingCount: await fastify.redis.sCard(`user:${targetUserId}:following`),
      readingListsCount: await fastify.redis.zCard(`user:${targetUserId}:reading_list`),
    };

    const userWithStats = { ...targetUser, ...stats };

    return {
      success: true,
      data: sanitizeUser(userWithStats, isOwnProfile, isFollowing, targetUser.readingPrivacy as any),
    });
  });

  // GET /users/:username/stats - Get user stats
  fastify.get("/:username/stats", {
    preHandler: [fastify.authenticate, fastify.requirePrivacy("public")],
    schema: { params: userParamsSchema.shape.params },
  }, async (request, reply) => {
    const { username } = request.params;
    const targetUserId = await fastify.redis.get(`user:username:${username}`);

    if (!targetUserId) {
      return reply.code(404).send({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User not found", requestId: request.requestId },
      });
    }

    // Get reading list items
    const readingList = await fastify.redis.zRange(`user:${targetUserId}:reading_list`, 0, -1);
    const items = readingList.map(i => JSON.parse(i));

    // Compute detailed stats
    const stats = {
      reading: items.filter((i: any) => i.status === "reading").length,
      wantToRead: items.filter((i: any) => i.status === "want_to_read").length,
      finished: items.filter((i: any) => i.status === "finished").length,
      dropped: items.filter((i: any) => i.status === "dropped").length,
      onHold: items.filter((i: any) => i.status === "on_hold").length,
      books: {
        reading: items.filter((i: any) => i.workType === "book" && i.status === "reading").length,
        wantToRead: items.filter((i: any) => i.workType === "book" && i.status === "want_to_read").length,
        finished: items.filter((i: any) => i.workType === "book" && i.status === "finished").length,
      },
      manga: {
        reading: items.filter((i: any) => i.workType === "manga" && i.status === "reading").length,
        wantToRead: items.filter((i: any) => i.workType === "manga" && i.status === "want_to_read").length,
        finished: items.filter((i: any) => i.workType === "manga" && i.status === "finished").length,
      },
      averageRating: items.filter((i: any) => i.rating).reduce((sum: number, i: any) => sum + (i.rating || 0), 0) / 
        Math.max(1, items.filter((i: any) => i.rating).length),
      totalPagesRead: items.filter((i: any) => i.workType === "book" && i.status === "finished")
        .reduce((sum: number, i: any) => sum + (i.totalProgress || 0), 0),
      totalChaptersRead: items.filter((i: any) => i.workType === "manga" && i.status === "finished")
        .reduce((sum: number, i: any) => sum + (i.totalProgress || 0), 0),
      followersCount: await fastify.redis.sCard(`user:${targetUserId}:followers`),
      followingCount: await fastify.redis.sCard(`user:${targetUserId}:following`),
    };

    return { success: true, data: stats };
  });

  // GET /users/:username/reading-list - Alias for social reading endpoint
  fastify.get("/:username/reading-list", {
    preHandler: [fastify.authenticate, fastify.requirePrivacy("public")],
  }, async (request, reply) => {
    // Redirect to social route
    return reply.redirect(`/users/${request.params.username}/reading`);
  });
};
