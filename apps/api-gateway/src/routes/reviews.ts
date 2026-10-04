import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const reviewQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
    sortBy: z.enum([
      'createdAt.desc',
      'createdAt.asc',
      'likesCount.desc',
      'rating.desc',
    ]).default('createdAt.desc'),
    userId: z.string().optional(),
    movieId: z.string().optional(),
    minRating: z.coerce.number().min(0.5).max(5).optional(),
    maxRating: z.coerce.number().min(0.5).max(5).optional(),
  }),
})

const createReviewSchema = z.object({
  body: z.object({
    movieId: z.string(),
    rating: z.number().min(0.5).max(5).multipleOf(0.5),
    content: z.string().min(10).max(5000),
    spoiler: z.boolean().default(false),
  }),
})

const reviewResponse = z.object({
  id: z.string(),
  userId: z.string(),
  movieId: z.string(),
  rating: z.number(),
  content: z.string(),
  spoiler: z.boolean(),
  likesCount: z.number(),
  commentsCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
  }).optional(),
  movie: z.object({
    id: z.string(),
    title: z.string(),
    posterPath: z.string().nullable(),
  }).optional(),
})

const reviewsListResponse = z.object({
  data: z.array(reviewResponse),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
})

export const reviewRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', {
    schema: {
      querystring: reviewQuerySchema.shape.query,
      response: {
        200: reviewsListResponse,
      },
    },
  }, async (request, reply) => {
    const { page, limit, sortBy, userId, movieId, minRating, maxRating } = request.query as z.infer<typeof reviewQuerySchema.shape.query>

    const cacheKey = `reviews:list:${JSON.stringify({ page, limit, sortBy, userId, movieId, minRating, maxRating })}`
    const cached = await fastify.redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const reviews = await getReviews({ page, limit, sortBy, userId, movieId, minRating, maxRating })

    const response = {
      data: reviews,
      meta: {
        page,
        limit,
        total: reviews.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: page > 1,
      },
    }

    await fastify.redis.setEx(cacheKey, 60, JSON.stringify(response))
    return response
  })

  fastify.get('/:id', {
    schema: {
      params: z.object({ id: z.string() }),
      response: {
        200: reviewResponse,
        404: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const cacheKey = `review:${id}`
    const cached = await fastify.redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const review = await getReviewById(id)
    if (!review) {
      return reply.code(404).send({ statusCode: 404, message: 'Review não encontrada' })
    }

    await fastify.redis.setEx(cacheKey, 300, JSON.stringify(review))
    return review
  })

  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: {
      body: createReviewSchema.shape.body,
      response: {
        201: reviewResponse,
        400: z.object({
          statusCode: z.number(),
          message: z.string(),
          errors: z.array(z.object({
            field: z.string(),
            message: z.string(),
          })).optional(),
        }),
        401: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    const { movieId, rating, content, spoiler } = request.body as z.infer<typeof createReviewSchema.shape.body>
    const userId = request.user!.id

    const existing = await fastify.redis.hGet(`user:${userId}:reviews`, movieId)
    if (existing) {
      return reply.code(400).send({ statusCode: 400, message: 'Você já avaliou este filme' })
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    const review = {
      id,
      userId,
      movieId,
      rating,
      content,
      spoiler,
      likesCount: 0,
      commentsCount: 0,
      createdAt: now,
      updatedAt: now,
    }

    await Promise.all([
      fastify.redis.hSet(`review:${id}`, review),
      fastify.redis.hSet(`user:${userId}:reviews`, movieId, id),
      fastify.redis.sAdd(`movie:${movieId}:reviews`, id),
      fastify.redis.zAdd('reviews:recent', { score: Date.now(), value: id }),
    ])

    await invalidateReviewCaches(movieId, userId)

    return reply.code(201).send(review)
  })

  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      params: z.object({ id: z.string() }),
      body: z.object({
        rating: z.number().min(0.5).max(5).multipleOf(0.5).optional(),
        content: z.string().min(10).max(5000).optional(),
        spoiler: z.boolean().optional(),
      }),
      response: {
        200: reviewResponse,
        401: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
        403: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
        404: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user!.id

    const review = await fastify.redis.hGetAll(`review:${id}`)
    if (!review.id) {
      return reply.code(404).send({ statusCode: 404, message: 'Review não encontrada' })
    }

    if (review.userId !== userId) {
      return reply.code(403).send({ statusCode: 403, message: 'Não autorizado' })
    }

    const updates: Record<string, string> = {}
    const { rating, content, spoiler } = request.body as any
    if (rating !== undefined) updates.rating = rating.toString()
    if (content !== undefined) updates.content = content
    if (spoiler !== undefined) updates.spoiler = spoiler.toString()
    updates.updatedAt = new Date().toISOString()

    await fastify.redis.hSet(`review:${id}`, updates)
    await invalidateReviewCaches(review.movieId, userId)

    const updated = await fastify.redis.hGetAll(`review:${id}`)
    return updated
  })

  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      params: z.object({ id: z.string() }),
      response: {
        204: z.null(),
        401: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
        403: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
        404: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user!.id

    const review = await fastify.redis.hGetAll(`review:${id}`)
    if (!review.id) {
      return reply.code(404).send({ statusCode: 404, message: 'Review não encontrada' })
    }

    if (review.userId !== userId) {
      return reply.code(403).send({ statusCode: 403, message: 'Não autorizado' })
    }

    await Promise.all([
      fastify.redis.del(`review:${id}`),
      fastify.redis.hDel(`user:${userId}:reviews`, review.movieId),
      fastify.redis.sRem(`movie:${review.movieId}:reviews`, id),
      fastify.redis.zRem('reviews:recent', id),
    ])

    await invalidateReviewCaches(review.movieId, userId)

    return reply.code(204).send()
  })

  fastify.post('/:id/like', {
    preHandler: [fastify.authenticate],
    schema: {
      params: z.object({ id: z.string() }),
      response: {
        200: z.object({
          liked: z.boolean(),
          likesCount: z.number(),
        }),
        401: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
        404: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user!.id

    const review = await fastify.redis.hGetAll(`review:${id}`)
    if (!review.id) {
      return reply.code(404).send({ statusCode: 404, message: 'Review não encontrada' })
    }

    const liked = await fastify.redis.sIsMember(`review:${id}:likes`, userId)
    if (liked) {
      await fastify.redis.sRem(`review:${id}:likes`, userId)
      const likesCount = parseInt(review.likesCount) - 1
      await fastify.redis.hSet(`review:${id}`, { likesCount: likesCount.toString() })
      await invalidateReviewCaches(review.movieId)
      return { liked: false, likesCount }
    } else {
      await fastify.redis.sAdd(`review:${id}:likes`, userId)
      const likesCount = parseInt(review.likesCount) + 1
      await fastify.redis.hSet(`review:${id}`, { likesCount: likesCount.toString() })
      await invalidateReviewCaches(review.movieId)
      return { liked: true, likesCount }
    }
  })
}

async function getReviews(params: any) {
  return [
    {
      id: '1',
      userId: 'user1',
      movieId: '1',
      rating: 4.5,
      content: 'Um filme incrível que te faz questionar a realidade. Brad Pitt e Edward Norton estão perfeitos.',
      spoiler: false,
      likesCount: 42,
      commentsCount: 5,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      user: {
        id: 'user1',
        username: 'cinefilo123',
        displayName: 'João Silva',
        avatarUrl: null,
      },
      movie: {
        id: '1',
        title: 'Clube da Luta',
        posterPath: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      },
    },
  ]
}

async function getReviewById(id: string) {
  return null
}

async function invalidateReviewCaches(movieId?: string, userId?: string) {
  const keys = await fastify.redis.keys('reviews:list:*')
  if (keys.length > 0) {
    await fastify.redis.del(keys)
  }
  if (movieId) {
    const movieKeys = await fastify.redis.keys(`movie:${movieId}:*`)
    if (movieKeys.length > 0) {
      await fastify.redis.del(movieKeys)
    }
  }
}