import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { ReadingStatus, WorkType } from "@letterbookxd/shared-types";
import { v4 as uuidv4 } from "uuid";

const addToListSchema = z.object({
  body: z.object({
    workId: z.string().uuid(),
    workType: z.enum(["book", "manga"]),
    status: z.enum(["reading", "want_to_read", "finished", "dropped", "on_hold"]).default("want_to_read"),
    progress: z.number().int().min(0).optional(),
    totalProgress: z.number().int().positive().optional(),
    notes: z.string().max(2000).optional(),
    isPublic: z.boolean().default(true),
  }),
});

const updateListSchema = z.object({
  params: z.object({ workId: z.string().uuid() }),
  body: z.object({
    status: z.enum(["reading", "want_to_read", "finished", "dropped", "on_hold"]).optional(),
    progress: z.number().int().min(0).optional(),
    totalProgress: z.number().int().positive().optional(),
    rating: z.number().min(0.5).max(5).step(0.5).optional(),
    notes: z.string().max(2000).optional(),
    isPublic: z.boolean().optional(),
  }),
});

const listQuerySchema = z.object({
  querystring: z.object({
    status: z.enum(["reading", "want_to_read", "finished", "dropped", "on_hold", "all"]).default("all"),
    workType: z.enum(["book", "manga", "all"]).default("all"),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
    sort: z.enum(["updated", "added", "rating", "progress", "title"]).default("updated"),
    order: z.enum(["asc", "desc"]).default("desc"),
  }),
});

async function emitActivity(fastify: any, userId: string, type: string, workId: string, workType: WorkType, metadata: any) {
  const activityId = uuidv4();
  const activity = {
    id: activityId,
    userId,
    type,
    workId,
    workType,
    metadata,
    createdAt: new Date().toISOString(),
  };

  await fastify.redis.zAdd(`user:${userId}:activities`, { score: Date.now(), value: JSON.stringify(activity) });
  await fastify.redis.zAdd("global:activities", { score: Date.now(), value: JSON.stringify(activity) });

  // Trim to last 1000
  await fastify.redis.zRemRangeByRank(`user:${userId}:activities`, 0, -1001);
  await fastify.redis.zRemRangeByRank("global:activities", 0, -1001);
}

export const readingListRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /reading-list - Get user reading list
  fastify.get("/", {
    preHandler: [fastify.authenticate],
    schema: { querystring: listQuerySchema.shape.querystring },
  }, async (request, reply) => {
    const userId = request.user!.sub;
    const { status, workType, page, limit, sort, order } = request.query;

    // Get all list items
    const allItems = await fastify.redis.zRange(`user:${userId}:reading_list`, 0, -1);
    let items = allItems.map(item => JSON.parse(item));

    // Filter by status
    if (status !== "all") {
      items = items.filter((item: any) => item.status === status);
    }

    // Filter by work type
    if (workType !== "all") {
      items = items.filter((item: any) => item.workType === workType);
    }

    // Sort
    items.sort((a: any, b: any) => {
      let valA: any, valB: any;
      switch (sort) {
        case "updated": valA = new Date(a.updatedAt).getTime(); valB = new Date(b.updatedAt).getTime(); break;
        case "added": valA = new Date(a.createdAt).getTime(); valB = new Date(b.createdAt).getTime(); break;
        case "rating": valA = a.rating || 0; valB = b.rating || 0; break;
        case "progress": valA = a.progress || 0; valB = b.progress || 0; break;
        case "title": valA = a.work?.title || ""; valB = b.work?.title || ""; break;
      }
      return order === "asc" ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    // Paginate
    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    const paginated = items.slice((page - 1) * limit, page * limit);

    // Enrich with work data
    const enriched = await Promise.all(paginated.map(async (item: any) => {
      const workCacheKey = `${item.workType === "book" ? "book" : "manga"}:${item.workId}`;
      let work = await fastify.redis.get(workCacheKey);
      if (work) {
        work = JSON.parse(work);
      } else {
        // Fetch from external API
        try {
          if (item.workType === "book") {
            const bookData = await fastify.externalApi.getBookById(item.workId);
            if (bookData) {
              work = {
                id: bookData.key?.replace("/works/", "") || item.workId,
                source: "openlibrary",
                type: "book",
                title: bookData.title,
                coverUrl: bookData.cover_i ? `https://covers.openlibrary.org/b/id/${bookData.cover_i}-M.jpg` : undefined,
                authors: bookData.author_name?.map((n: string) => ({ name: n })) || [],
              };
            }
          } else {
            const mangaData = await fastify.externalApi.getMangaById(item.workId);
            if (mangaData?.data) {
              const attrs = mangaData.data.attributes;
              work = {
                id: mangaData.data.id,
                source: "mangadex",
                type: "manga",
                title: attrs.title?.en || Object.values(attrs.title)[0],
                coverUrl: mangaData.data.relationships?.find((r: any) => r.type === "cover_art")?.attributes?.fileName 
                  ? `https://uploads.mangadex.org/covers/${item.workId}/${mangaData.data.relationships.find((r: any) => r.type === "cover_art")?.attributes?.fileName}.256.jpg`
                  : undefined,
                authors: [],
              };
            }
          }
        } catch {
          work = { id: item.workId, title: "Unknown", coverUrl: undefined };
        }
      }
      return { ...item, work };
    }));

    return {
      success: true,
      data: enriched,
      meta: { page, limit, total, totalPages: Math.ceil(items.length / limit), hasNext: page < Math.ceil(items.length / limit), hasPrev: page > 1 },
    };
  });

  // GET /reading-list/stats - Get reading list stats
  fastify.get("/stats", {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = request.user!.sub;
    const allItems = await fastify.redis.zRange(`user:${userId}:reading_list`, 0, -1);
    const items = allItems.map(item => JSON.parse(item));

    const stats = {
      reading: items.filter((i: any) => i.status === "reading").length,
      wantToRead: items.filter((i: any) => i.status === "want_to_read").length,
      finished: items.filter((i: any) => i.status === "finished").length,
      dropped: items.filter((i: any) => i.status === "dropped").length,
      onHold: items.filter((i: any) => i.status === "on_hold").length,
      total: items.length,
      booksFinished: items.filter((i: any) => i.workType === "book" && i.status === "finished").length,
      mangaFinished: items.filter((i: any) => i.workType === "manga" && i.status === "finished").length,
      totalPagesRead: items.filter((i: any) => i.workType === "book" && i.status === "finished")
        .reduce((sum: number, i: any) => sum + (i.totalProgress || 0), 0),
      totalChaptersRead: items.filter((i: any) => i.workType === "manga" && i.status === "finished")
        .reduce((sum: number, i: any) => sum + (i.totalProgress || 0), 0),
    };

    return { success: true, data: stats };
  });

  // POST /reading-list - Add to reading list
  fastify.post("/", {
    preHandler: [fastify.authenticate, fastify.rateLimit.mutation],
    schema: { body: addToListSchema.shape.body },
  }, async (request, reply) => {
    const userId = request.user!.sub;
    const { workId, workType, status, progress, totalProgress, notes, isPublic } = request.body;

    // Check if work exists
    const workCacheKey = `${workType === "book" ? "book" : "manga"}:${workId}`;
    let workExists = await fastify.redis.get(workCacheKey);
    if (!workExists) {
      try {
        if (workType === "book") {
          await fastify.externalApi.getBookById(workId);
        } else {
          await fastify.externalApi.getMangaById(workId);
        }
        workExists = "true";
      } catch {
        return reply.code(404).send({
          success: false,
          error: { code: "WORK_NOT_FOUND", message: "Work not found", requestId: request.requestId },
        });
      }
    }

    // Check if already in list
    const existing = await fastify.redis.zScore(`user:${userId}:reading_list`, workId);
    if (existing !== null) {
      return reply.code(409).send({
        success: false,
        error: { code: "ALREADY_IN_LIST", message: "Work already in your reading list", requestId: request.requestId },
      });
    }

    const now = new Date().toISOString();
    const item = {
      id: uuidv4(),
      userId,
      workId,
      workType,
      status,
      progress: progress || 0,
      totalProgress: totalProgress || null,
      notes: notes || null,
      isPublic,
      startedAt: status === "reading" ? now : null,
      finishedAt: status === "finished" ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    // Add to sorted set (score = timestamp for sorting)
    await fastify.redis.zAdd(`user:${userId}:reading_list`, { score: Date.now(), value: JSON.stringify(item) });
    
    // Also index by workId for quick lookup
    await fastify.redis.zAdd(`user:${userId}:reading_list:by_work`, { score: Date.now(), value: workId });

    // Emit activity
    await emitActivity(fastify, item.userId, "added_to_list", workId, workType, { status });

    // Update stats
    await fastify.redis.incr(`user:${userId}:stats:reading_list_count`);

    return reply.code(201).send({ success: true, data: item });
  });

  // PATCH /reading-list/:workId - Update reading list item
  fastify.patch("/:workId", {
    preHandler: [fastify.authenticate, fastify.rateLimit.mutation],
    schema: { params: z.object({ params: z.object({ workId: z.string().uuid() }) }).shape.params, body: updateListSchema.shape.body },
  }, async (request, reply) => {
    const userId = request.user!.sub;
    const { workId } = request.params;
    const { status, progress, totalProgress, rating, notes, isPublic } = request.body;

    // Get existing item
    const allItems = await fastify.redis.zRange(`user:${userId}:reading_list`, 0, -1);
    const existingIndex = allItems.findIndex(item => JSON.parse(item).workId === workId);
    
    if (existingIndex === -1) {
      return reply.code(404).send({
        success: false,
        error: { code: "NOT_IN_LIST", message: "Work not in your reading list", requestId: request.requestId },
      });
    }

    const item = JSON.parse(allItems[existingIndex]);
    const oldStatus = item.status;

    // Update fields
    if (status) item.status = status;
    if (progress !== undefined) item.progress = progress;
    if (totalProgress !== undefined) item.totalProgress = totalProgress;
    if (rating !== undefined) item.rating = rating;
    if (notes !== undefined) item.notes = notes;
    if (isPublic !== undefined) item.isPublic = isPublic;
    item.updatedAt = new Date().toISOString();

    // Handle status transitions
    if (status === "reading" && oldStatus !== "reading") {
      item.startedAt = new Date().toISOString();
    }
    if (status === "finished" && oldStatus !== "finished") {
      item.finishedAt = new Date().toISOString();
      item.progress = item.totalProgress || item.progress;
    }

    // Update in sorted set
    await fastify.redis.zRem(`user:${userId}:reading_list`, allItems[existingIndex]);
    await fastify.redis.zAdd(`user:${userId}:reading_list`, { score: Date.now(), value: JSON.stringify(item) });

    // Emit activity based on change
    if (status && status !== oldStatus) {
      await emitActivity(fastify, userId, status === "finished" ? "finished_reading" : "started_reading", workId, item.workType, { oldStatus, newStatus: status });
    }
    if (rating !== undefined) {
      await emitActivity(fastify, userId, "rated", workId, item.workType, { rating });
    }
    if (progress !== undefined && progress > (item.progress || 0)) {
      await emitActivity(fastify, userId, "updated_progress", workId, item.workType, { progress });
    }

    // Store rating separately if provided
    if (rating !== undefined) {
      await fastify.redis.hSet(`user:${request.user!.sub}:ratings:${item.workType}`, workId, rating.toString());
    }

    return { success: true, data: item };
  });

  // DELETE /reading-list/:workId - Remove from reading list
  fastify.delete("/:workId", {
    preHandler: [fastify.authenticate, fastify.rateLimit.mutation],
    schema: { params: z.object({ params: z.object({ workId: z.string().uuid() }) }).shape.params },
  }, async (request, reply) => {
    const userId = request.user!.sub;
    const { workId } = request.params;

    const allItems = await fastify.redis.zRange(`user:${userId}:reading_list`, 0, -1);
    const existingIndex = allItems.findIndex(item => JSON.parse(item).workId === workId);
    
    if (existingIndex === -1) {
      return reply.code(404).send({
        success: false,
        error: { code: "NOT_IN_LIST", message: "Work not in your reading list", requestId: request.requestId },
      });
    }

    const item = JSON.parse(allItems[existingIndex]);

    // Remove from sorted sets
    await fastify.redis.zRem(`user:${userId}:reading_list`, allItems[existingIndex]);
    await fastify.redis.zRem(`user:${userId}:reading_list:by_work`, workId);

    // Decrement stats
    await fastify.redis.decr(`user:${userId}:stats:reading_list_count`);

    return { success: true, message: "Removed from reading list" };
  });
};
