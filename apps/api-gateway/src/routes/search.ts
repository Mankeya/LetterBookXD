import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { WorkType } from "@letterbookxd/shared-types";

const searchQuerySchema = z.object({
  querystring: z.object({
    q: z.string().min(1).max(200),
    type: z.enum(["all", "books", "manga"]).default("all"),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
    lang: z.array(z.string()).optional(),
    genre: z.array(z.string()).optional(),
    author: z.array(z.string()).optional(),
    demographic: z.enum(["shonen", "seinen", "shojo", "josei", "kodomomuke"]).optional(),
    status: z.enum(["ongoing", "completed", "hiatus", "cancelled"]).optional(),
    sort: z.enum(["relevance", "rating", "popularity", "recent", "title"]).default("relevance"),
    order: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", {
    schema: { querystring: searchQuerySchema.shape.querystring },
  }, async (request, reply) => {
    const { q, type, page, limit, lang, genre, author, demographic, status, sort, order } = request.query;

    const results: any = { works: [], meta: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: page > 1 } };

    // Search books (Open Library)
    if (type === "all" || type === "books") {
      try {
        const bookResults = await fastify.externalApi.searchBooks({
          q,
          page,
          limit,
          lang,
          subject: genre?.[0],
          author: author?.[0],
        });

        const books = bookResults.docs?.map((doc: any) => ({
          id: doc.key?.replace("/works/", "") || doc.id,
          source: "openlibrary" as const,
          type: "book" as WorkType,
          externalId: doc.key?.replace("/works/", "") || doc.id,
          title: doc.title,
          coverUrl: doc.cover_i ? fastify.externalApi.getCoverUrl(doc.cover_i, "M") : undefined,
          authors: doc.author_name?.map((name: string) => ({ id: "", name })) || [],
          description: doc.first_sentence,
          genres: doc.subject || [],
          publishedYear: doc.first_publish_year,
          rating: { average: doc.rating_average || 0, count: doc.ratings_count || 0 },
          language: doc.language?.[0] || "en",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })) || [];

        results.works.push(...books);
        results.meta.total += bookResults.numFound || 0;
      } catch (error) {
        fastify.log.error({ err: error, event: "search.books_failed" }, "Books search failed");
      }
    }

    // Search manga (MangaDex)
    if (type === "all" || type === "manga") {
      try {
        const mangaResults = await fastify.externalApi.searchManga({
          title: q,
          page,
          limit,
          lang,
          demographic: demographic ? [demographic] : undefined,
          status: status ? [status] : undefined,
        });

        const manga = mangaResults.data?.map((item: any) => {
          const attrs = item.attributes;
          const relationships = item.relationships;
          
          const coverRel = relationships?.find((r: any) => r.type === "cover_art");
          const coverId = coverRel?.attributes?.fileName;
          const coverUrl = coverId ? `https://uploads.mangadex.org/covers/${item.id}/${coverId}.256.jpg` : undefined;

          const authorRel = relationships?.find((r: any) => r.type === "author" || r.type === "artist");
          
          return {
            id: item.id,
            source: "mangadex" as const,
            type: "manga" as WorkType,
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
            createdAt: attrs.createdAt,
            updatedAt: attrs.updatedAt,
          };
        }) || [];

        results.works.push(...manga);
        results.meta.total += mangaResults.total || 0;
      } catch (error) {
        fastify.log.error({ err: error, event: "search.manga_failed" }, "Manga search failed");
      }
    }

    // Sort combined results
    if (sort !== "relevance") {
      results.works.sort((a: any, b: any) => {
        let valA: any, valB: any;
        switch (sort) {
          case "rating": valA = a.rating.average; valB = b.rating.average; break;
          case "popularity": valA = a.rating.count; valB = b.rating.count; break;
          case "recent": valA = new Date(a.updatedAt).getTime(); valB = new Date(b.updatedAt).getTime(); break;
          case "title": valA = a.title; valB = b.title; break;
        }
        return order === "asc" ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
    }

    results.meta.totalPages = Math.ceil(results.meta.total / limit);
    results.meta.hasNext = page < results.meta.totalPages;

    return { success: true, data: results };
  });

  // Suggestions endpoint
  fastify.get("/suggestions", {
    schema: {
      querystring: z.object({
        q: z.string().min(1).max(100),
        limit: z.coerce.number().int().positive().max(10).default(5),
      }),
    },
  }, async (request, reply) => {
    const { q, limit } = request.query;
    
    // In production, use a dedicated suggestions index
    // For now, return empty
    return { success: true, data: { suggestions: [] } };
  });
};
