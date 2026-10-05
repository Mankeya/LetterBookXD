import { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const bookParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

const editionsQuerySchema = z.object({
  querystring: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});

export const booksRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /books/:id - Get book details
  fastify.get("/:id", {
    schema: { params: bookParamsSchema.shape.params },
  }, async (request, reply) => {
    const { id } = request.params;
    const cacheKey = `book:${id}`;
    
    // Check cache
    const cached = await fastify.redis.get(cacheKey);
    if (cached) {
      return { success: true, data: JSON.parse(cached) };
    }

    try {
      const bookData = await fastify.externalApi.getBookById(id);
      
      if (!bookData) {
        return reply.code(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Book not found", requestId: request.requestId },
        });
      }

      const book = transformBook(bookData);
      
      // Cache for 1 hour
      await fastify.redis.setEx(cacheKey, 3600, JSON.stringify(book));
      
      // Add user rating if authenticated
      if (request.user) {
        const userRating = await fastify.redis.hGet(`user:${request.user.sub}:ratings:books`, id);
        if (userRating) {
          book.userRating = parseFloat(userRating);
        }
      }

      return { success: true, data: book };
    } catch (error) {
      fastify.log.error({ err: error, bookId: id }, "Failed to fetch book");
      return reply.code(500).send({
        success: false,
        error: { code: "EXTERNAL_API_ERROR", message: "Failed to fetch book", requestId: request.requestId },
      });
    }
  });

  // GET /books/:id/editions - Get book editions
  fastify.get("/:id/editions", {
    schema: { 
      params: bookParamsSchema.shape.params,
      querystring: editionsQuerySchema.shape.querystring,
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { page, limit } = request.query;

    try {
      const editionsData = await fastify.externalApi.getBookEditions(id);
      
      const editions = editionsData.entries?.map((entry: any) => ({
        id: entry.key?.replace("/books/", "") || entry.id,
        isbn13: entry.isbn_13?.[0],
        isbn10: entry.isbn_10?.[0],
        publishDate: entry.publish_date,
        publisher: entry.publishers?.[0],
        pageCount: entry.number_of_pages,
        language: entry.languages?.[0]?.key?.replace("/languages/", ""),
        coverUrl: entry.cover?.medium || entry.cover?.large,
      })).slice((page - 1) * limit, page * limit) || [];

      return { 
        success: true, 
        data: editions,
        meta: { page, limit, total: editionsData.entries?.length || 0 }
      };
    } catch (error) {
      fastify.log.error({ err: error, bookId: id }, "Failed to fetch editions");
      return reply.code(500).send({
        success: false,
        error: { code: "EXTERNAL_API_ERROR", message: "Failed to fetch editions", requestId: request.requestId },
      });
    }
  });

  // GET /books/trending - Get trending books
  fastify.get("/trending", {
    schema: {
      querystring: z.object({
        limit: z.coerce.number().int().positive().max(20).default(10),
        timeframe: z.enum(["day", "week", "month"]).default("week"),
      }),
    },
  }, async (request, reply) => {
    const { limit } = request.query;
    
    // In production, use a computed trending list
    // For now, search for popular books
    try {
      const results = await fastify.externalApi.searchBooks({
        q: "",
        limit,
        sort: "rating",
      });

      const books = results.docs?.slice(0, limit).map((doc: any) => transformBook(doc)) || [];
      return { success: true, data: books };
    } catch (error) {
      return { success: true, data: [] };
    }
  });
};

function transformBook(doc: any): any {
  return {
    id: doc.key?.replace("/works/", "") || doc.id,
    source: "openlibrary",
    type: "book",
    externalId: doc.key?.replace("/works/", "") || doc.id,
    title: doc.title,
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
    authors: doc.author_name?.map((name: string) => ({ id: "", name })) || [],
    description: doc.first_sentence || doc.description?.value || doc.description,
    genres: doc.subject || [],
    publishedYear: doc.first_publish_year,
    rating: { average: doc.rating_average || 0, count: doc.ratings_count || 0 },
    isbn13: doc.isbn?.[0],
    isbn10: doc.isbn?.[1],
    pageCount: doc.number_of_pages_median,
    publisher: doc.publisher?.[0],
    language: doc.language?.[0] || "en",
    subjects: doc.subject || [],
    previewUrl: doc.ebook_access === "borrow" ? `https://openlibrary.org${doc.key}` : undefined,
    editions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
