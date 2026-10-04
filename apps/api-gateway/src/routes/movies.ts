import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const movieQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
    sortBy: z.enum([
      'popularity.desc',
      'popularity.asc',
      'release_date.desc',
      'release_date.asc',
      'vote_average.desc',
      'vote_average.asc',
      'title.asc',
      'title.desc',
    ]).default('popularity.desc'),
    genreIds: z.coerce.number().int().positive().array().optional(),
    year: z.coerce.number().int().min(1900).max(2100).optional(),
    query: z.string().optional(),
  }),
})

const movieResponse = z.object({
  data: z.array(z.object({
    id: z.string(),
    tmdbId: z.number(),
    title: z.string(),
    originalTitle: z.string(),
    overview: z.string(),
    releaseDate: z.string(),
    runtime: z.number(),
    posterPath: z.string().nullable(),
    backdropPath: z.string().nullable(),
    genres: z.array(z.object({
      id: z.number(),
      name: z.string(),
    })),
    voteAverage: z.number(),
    voteCount: z.number(),
    popularity: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
})

const movieDetailResponse = z.object({
  id: z.string(),
  tmdbId: z.number(),
  title: z.string(),
  originalTitle: z.string(),
  overview: z.string(),
  releaseDate: z.string(),
  runtime: z.number(),
  posterPath: z.string().nullable(),
  backdropPath: z.string().nullable(),
  genres: z.array(z.object({
    id: z.number(),
    name: z.string(),
  })),
  voteAverage: z.number(),
  voteCount: z.number(),
  popularity: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  userRating: z.number().nullable().optional(),
  userReview: z.any().nullable().optional(),
})

export const movieRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', {
    schema: {
      querystring: movieQuerySchema.shape.query,
      response: {
        200: movieResponse,
      },
    },
  }, async (request, reply) => {
    const { page, limit, sortBy, genreIds, year, query } = request.query as z.infer<typeof movieQuerySchema.shape.query>

    const cacheKey = `movies:list:${JSON.stringify({ page, limit, sortBy, genreIds, year, query })}`
    const cached = await fastify.redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    const movies = await getMoviesFromTMDB({ page, limit, sortBy, genreIds, year, query })

    const response = {
      data: movies,
      meta: {
        page,
        limit,
        total: movies.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: page > 1,
      },
    }

    await fastify.redis.setEx(cacheKey, 300, JSON.stringify(response))
    return response
  })

  fastify.get('/genres', {
    schema: {
      response: {
        200: z.object({
          data: z.array(z.object({
            id: z.number(),
            name: z.string(),
          })),
        }),
      },
    },
  }, async () => {
    const cacheKey = 'movies:genres'
    const cached = await fastify.redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const genres = await getGenresFromTMDB()
    await fastify.redis.setEx(cacheKey, 86400, JSON.stringify({ data: genres }))
    return { data: genres }
  })

  fastify.get('/:id', {
    schema: {
      params: z.object({ id: z.string() }),
      response: {
        200: movieDetailResponse,
        404: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user?.id

    const cacheKey = `movie:${id}${userId ? `:user:${userId}` : ''}`
    const cached = await fastify.redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const movie = await getMovieFromTMDB(id, userId)
    if (!movie) {
      return reply.code(404).send({ statusCode: 404, message: 'Filme não encontrado' })
    }

    await fastify.redis.setEx(cacheKey, 3600, JSON.stringify(movie))
    return movie
  })

  fastify.post('/:id/rate', {
    preHandler: [fastify.authenticate],
    schema: {
      params: z.object({ id: z.string() }),
      body: z.object({
        rating: z.number().min(0.5).max(5).multipleOf(0.5),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          rating: z.number(),
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
    const { rating } = request.body as { rating: number }
    const userId = request.user!.id

    const movie = await getMovieFromTMDB(id)
    if (!movie) {
      return reply.code(404).send({ statusCode: 404, message: 'Filme não encontrado' })
    }

    await fastify.redis.hSet(`user:${userId}:ratings`, id, rating.toString())
    await fastify.redis.del(`movie:${id}:user:${userId}`)

    return { success: true, rating }
  })
}

async function getMoviesFromTMDB(params: any) {
  return [
    {
      id: '1',
      tmdbId: 550,
      title: 'Clube da Luta',
      originalTitle: 'Fight Club',
      overview: 'Um insone e um vendedor de sabonete criam um clube da luta clandestino.',
      releaseDate: '1999-10-15',
      runtime: 139,
      posterPath: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      backdropPath: '/8uO0gL8pJqWQkKvHkK6jK6jK6jK.jpg',
      genres: [{ id: 18, name: 'Drama' }, { id: 53, name: 'Thriller' }],
      voteAverage: 8.4,
      voteCount: 26000,
      popularity: 65.5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      tmdbId: 155,
      title: 'O Resgate do Soldado Ryan',
      originalTitle: 'Saving Private Ryan',
      overview: 'Após o desembarque na Normandia, um grupo de soldados parte em busca do soldado Ryan.',
      releaseDate: '1998-07-24',
      runtime: 169,
      posterPath: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      backdropPath: '/8uO0gL8pJqWQkKvHkK6jK6jK6jK.jpg',
      genres: [{ id: 18, name: 'Drama' }, { id: 28, name: 'Ação' }, { id: 10752, name: 'Guerra' }],
      voteAverage: 8.5,
      voteCount: 18000,
      popularity: 52.3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]
}

async function getGenresFromTMDB() {
  return [
    { id: 28, name: 'Ação' },
    { id: 12, name: 'Aventura' },
    { id: 16, name: 'Animação' },
    { id: 35, name: 'Comédia' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentário' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Família' },
    { id: 14, name: 'Fantasia' },
    { id: 36, name: 'História' },
    { id: 27, name: 'Terror' },
    { id: 10402, name: 'Música' },
    { id: 9648, name: 'Mistério' },
    { id: 10749, name: 'Romance' },
    { id: 878, name: 'Ficção Científica' },
    { id: 10770, name: 'Cinema TV' },
    { id: 53, name: 'Thriller' },
    { id: 10752, name: 'Guerra' },
    { id: 37, name: 'Faroeste' },
  ]
}

async function getMovieFromTMDB(id: string, userId?: string) {
  const movies = await getMoviesFromTMDB({})
  const movie = movies.find(m => m.id === id)
  if (!movie) return null

  let userRating: number | null = null
  if (userId) {
    const rating = await fastify.redis.hGet(`user:${userId}:ratings`, id)
    if (rating) userRating = parseFloat(rating)
  }

  return { ...movie, userRating, userReview: null }
}