import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { securityConfig } from "@letterbookxd/config";

const mangaParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const chapterParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const chaptersQuerySchema = z.object({
  querystring: z.object({
    lang: z.array(z.string()).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(500).default(100),
    order: z.enum(["asc", "desc"]).default("asc"),
  }),
});

const proxyQuerySchema = z.object({
  querystring: z.object({
    url: z.string().url(),
  }),
});

export const mangaRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /manga/:id - Get manga details
  fastify.get("/:id", {
    schema: { params: mangaParamsSchema.shape.params },
  }, async (request, reply) => {
    const { id } = request.params;
    const cacheKey = `manga:${id}`;

    const cached = await fastify.redis.get(cacheKey);
    if (cached) {
      const manga = JSON.parse(cached);
      if (request.user) {
        const userRating = await fastify.redis.hGet(`user:${request.user.sub}:ratings:manga`, id);
        if (userRating) manga.userRating = parseFloat(userRating);
      }
      return { success: true, data: manga };
    }

    try {
      const mangaData = await fastify.externalApi.getMangaById(id);
      
      if (!mangaData?.data) {
        return reply.code(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Manga not found", requestId: request.requestId },
        });
      }

      const manga = transformManga(mangaData.data);
      
      await fastify.redis.setEx(cacheKey, 1800, JSON.stringify(manga)); // 30 min

      if (request.user) {
        const userRating = await fastify.redis.hGet(`user:${request.user.sub}:ratings:manga`, id);
        if (userRating) manga.userRating = parseFloat(userRating);
      }

      return { success: true, data: manga };
    } catch (error) {
      fastify.log.error({ err: error, mangaId: id }, "Failed to fetch manga");
      return reply.code(500).send({
        success: false,
        error: { code: "EXTERNAL_API_ERROR", message: "Failed to fetch manga", requestId: request.requestId },
      });
    }
  });

  // GET /manga/:id/chapters - Get manga chapters
  fastify.get("/:id/chapters", {
    schema: { 
      params: mangaParamsSchema.shape.params,
      querystring: chaptersQuerySchema.shape.querystring,
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { lang, page, limit, order } = request.query;

    try {
      const chaptersData = await fastify.externalApi.getMangaChapters(id, { lang, page, limit, order });
      
      if (!chaptersData?.data) {
        return reply.code(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Manga not found", requestId: request.requestId },
        });
      }

      const chapters = chaptersData.data.map((item: any) => {
        const attrs = item.attributes;
        return {
          id: item.id,
          mangaId: id,
          externalId: item.id,
          volume: attrs.volume,
          chapter: attrs.chapter,
          title: attrs.title,
          language: attrs.translatedLanguage,
          pages: attrs.pages,
          publishedAt: attrs.publishAt,
          externalUrl: `https://mangadex.org/chapter/${item.id}`,
          scanlationGroup: attrs.scanlationGroup,
        };
      });

      return { 
        success: true, 
        data: chapters,
        meta: { 
          page: parseInt(String(page)), 
          limit: parseInt(String(limit)), 
          total: chaptersData.total || 0,
          totalPages: Math.ceil((chaptersData.total || 0) / limit),
        }
      };
    } catch (error) {
      fastify.log.error({ err: error, mangaId: id }, "Failed to fetch chapters");
      return reply.code(500).send({
        success: false,
        error: { code: "EXTERNAL_API_ERROR", message: "Failed to fetch chapters", requestId: request.requestId },
      });
    }
  });

  // GET /manga/chapters/:id - Get chapter details
  fastify.get("/chapters/:id", {
    schema: { params: chapterParamsSchema.shape.params },
  }, async (request, reply) => {
    const { id } = request.params;

    try {
      const chapterData = await fastify.externalApi.getChapterById(id);
      
      if (!chapterData?.data) {
        return reply.code(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Chapter not found", requestId: request.requestId },
        });
      }

      const chapter = chapterData.data;
      const attrs = chapter.attributes;

      return { 
        success: true, 
        data: {
          id: chapter.id,
          mangaId: chapter.relationships?.find((r: any) => r.type === "manga")?.id,
          volume: attrs.volume,
          chapter: attrs.chapter,
          title: attrs.title,
          language: attrs.translatedLanguage,
          pages: attrs.pages,
          publishedAt: attrs.publishAt,
          scanlationGroup: attrs.scanlationGroup,
        }
      };
    } catch (error) {
      fastify.log.error({ err: error, chapterId: id }, "Failed to fetch chapter");
      return reply.code(500).send({
        success: false,
        error: { code: "EXTERNAL_API_ERROR", message: "Failed to fetch chapter", requestId: request.requestId },
      });
    }
  });

  // GET /manga/chapters/:id/images - Get chapter images (for reader)
  fastify.get("/chapters/:id/images", {
    schema: { params: chapterParamsSchema.shape.params },
  }, async (request, reply) => {
    const { id } = request.params;
    const cacheKey = `chapter_images:${id}`;

    const cached = await fastify.redis.get(cacheKey);
    if (cached) {
      return { success: true, data: JSON.parse(cached) };
    }

    try {
      const atHomeData = await fastify.externalApi.getChapterImages(id);
      
      if (!atHomeData?.chapter) {
        return reply.code(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Chapter images not found", requestId: request.requestId },
        });
      }

      const { baseUrl, chapter, data, dataSaver } = atHomeData;

      const images = {
        baseUrl,
        chapter: {
          hash: chapter.hash,
          data: chapter.data,
          dataSaver: chapter.dataSaver,
        },
        pages: data.map((filename: string) => ({
          original: fastify.externalApi.getMangaImageUrl(baseUrl, chapter.hash, filename, false),
          dataSaver: fastify.externalApi.getMangaImageUrl(baseUrl, chapter.hash, filename, true),
        })),
        dataSaverPages: dataSaver.map((filename: string) => 
          fastify.externalApi.getMangaImageUrl(baseUrl, chapter.hash, filename, true)
        ),
      };

      // Cache for 24 hours
      await fastify.redis.setEx(cacheKey, 86400, JSON.stringify(images));

      return { success: true, data: images };
    } catch (error) {
      fastify.log.error({ err: error, chapterId: id }, "Failed to fetch chapter images");
      return reply.code(500).send({
        success: false,
        error: { code: "EXTERNAL_API_ERROR", message: "Failed to fetch chapter images", requestId: request.requestId },
      });
    }
  });

  // GET /manga/proxy - Proxy manga images (SSRF protected)
  fastify.get("/proxy", {
    schema: { querystring: proxyQuerySchema.shape.querystring },
  }, async (request, reply) => {
    const { url } = request.query;

    // Validate URL against allowed hosts
    if (!securityConfig.mangaProxy.validateUrl(url)) {
      await fastify.auditLogger.logSsrfAttempt(request, url, true);
      return reply.code(400).send({
        success: false,
        error: { code: "INVALID_URL", message: "Invalid or blocked image URL", requestId: request.requestId },
      });
    }

    const cacheKey = `proxy:${Buffer.from(url).toString("base64")}`;
    const cached = await fastify.redis.get(cacheKey);

    if (cached) {
      const [contentType, data] = JSON.parse(cached);
      reply.header("Content-Type", contentType);
      reply.header("Cache-Control", "public, max-age=86400");
      return reply.send(Buffer.from(data, "base64"));
    }

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "LetterBookXD/1.0",
          "Referer": "https://mangadex.org/",
        },
        signal: AbortSignal.timeout(securityConfig.mangaProxy.timeout),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Check size limit
      if (buffer.length > securityConfig.mangaProxy.maxSize) {
        return reply.code(413).send({
          success: false,
          error: { code: "IMAGE_TOO_LARGE", message: "Image exceeds size limit", requestId: request.requestId },
        });
      }

      // Cache for 24 hours
      await fastify.redis.setEx(cacheKey, 86400, JSON.stringify([contentType, buffer.toString("base64")]));

      reply.header("Content-Type", contentType);
      reply.header("Cache-Control", "public, max-age=86400");
      return reply.send(buffer);
    } catch (error) {
      fastify.log.error({ err: error, url }, "Failed to proxy image");
      return reply.code(502).send({
        success: false,
        error: { code: "PROXY_ERROR", message: "Failed to fetch image", requestId: request.requestId },
      });
    }
  });

  // GET /manga/trending - Get trending manga
  fastify.get("/trending", {
    schema: {
      querystring: z.object({
        limit: z.coerce.number().int().positive().max(20).default(10),
        demographic: z.enum(["shonen", "seinen", "shojo", "josei", "kodomomuke"]).optional(),
      }),
    },
  }, async (request, reply) => {
    const { limit, demographic } = request.query;

    try {
      const results = await fastify.externalApi.searchManga({
        limit,
        demographic: demographic ? [demographic] : undefined,
        order: { followedCount: "desc" },
      });

      const manga = results.data?.slice(0, limit).map((item: any) => transformManga(item)) || [];
      return { success: true, data: manga };
    } catch (error) {
      return { success: true, data: [] };
    }
  });
};

function transformManga(item: any): any {
  const attrs = item.attributes;
  const relationships = item.relationships;

  const coverRel = relationships?.find((r: any) => r.type === "cover_art");
  const coverId = coverRel?.attributes?.fileName;
  const coverUrl = coverId ? `https://uploads.mangadex.org/covers/${item.id}/${coverId}.256.jpg` : undefined;

  const authorRel = relationships?.find((r: any) => r.type === "author" || r.type === "artist");

  return {
    id: item.id,
    source: "mangadex",
    type: "manga",
    externalId: item.id,
    title: attrs.title?.en || Object.values(attrs.title)[0] as string,
    coverUrl,
    authors: authorRel ? [{ id: authorRel.id, name: authorRel.attributes?.name || "Unknown" }] : [],
    description: attrs.description?.en || Object.values(attrs.description || {})[0] as string,
    genres: attrs.tags?.map((t: any) => t.attributes?.name?.en || t.id) || [],
    publishedYear: attrs.year,
    rating: { average: attrs.rating?.average || 0, count: attrs.rating?.count || 0 },
    originalLanguage: attrs.originalLanguage,
    demographic: attrs.publicationDemographic || "unknown",
    status: attrs.status,
    chapterCount: attrs.chapterCount || 0,
    year: attrs.year,
    tags: attrs.tags?.map((t: any) => ({
      id: t.id,
      name: t.attributes?.name?.en || t.id,
      group: t.attributes?.group || "genre",
    })) || [],
    createdAt: attrs.createdAt,
    updatedAt: attrs.updatedAt,
  };
}
