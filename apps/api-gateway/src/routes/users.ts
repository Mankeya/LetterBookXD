import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const userResponse = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  stats: z.object({
    moviesWatched: z.number(),
    reviewsWritten: z.number(),
    followersCount: z.number(),
    followingCount: z.number(),
  }).optional(),
})

const usersListResponse = z.object({
  data: z.array(userResponse),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
})

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', {
    schema: {
      querystring: z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(50).default(20),
        query: z.string().optional(),
      }),
      response: {
        200: usersListResponse,
      },
    },
  }, async (request, reply) => {
    const { page, limit, query } = request.query as any

    const allUsers = await fastify.redis.sMembers('users:all')
    const users = []

    for (const userId of allUsers.slice((page - 1) * limit, page * limit)) {
      const user = await fastify.redis.hGetAll(`user:id:${userId}`)
      if (user.id) {
        users.push({
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl || null,
          bio: user.bio || null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })
      }
    }

    return {
      data: users,
      meta: {
        page,
        limit,
        total: allUsers.length,
        totalPages: Math.ceil(allUsers.length / limit),
        hasNext: page * limit < allUsers.length,
        hasPrev: page > 1,
      },
    }
  })

  fastify.get('/:username', {
    schema: {
      params: z.object({ username: z.string() }),
      response: {
        200: userResponse,
        404: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    const { username } = request.params as { username: string }
    const user = await fastify.redis.hGetAll(`user:username:${username}`)

    if (!user.id) {
      return reply.code(404).send({ statusCode: 404, message: 'Usuário não encontrado' })
    }

    const stats = {
      moviesWatched: await fastify.redis.hLen(`user:${user.id}:ratings`),
      reviewsWritten: await fastify.redis.hLen(`user:${user.id}:reviews`),
      followersCount: await fastify.redis.sCard(`user:${user.id}:followers`),
      followingCount: await fastify.redis.sCard(`user:${user.id}:following`),
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl || null,
      bio: user.bio || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      stats,
    }
  })

  fastify.post('/:username/follow', {
    preHandler: [fastify.authenticate],
    schema: {
      params: z.object({ username: z.string() }),
      response: {
        200: z.object({
          following: z.boolean(),
          followersCount: z.number(),
        }),
        401: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
        404: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
        400: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    const { username } = request.params as { username: string }
    const currentUserId = request.user!.id

    const targetUser = await fastify.redis.hGetAll(`user:username:${username}`)
    if (!targetUser.id) {
      return reply.code(404).send({ statusCode: 404, message: 'Usuário não encontrado' })
    }

    if (targetUser.id === currentUserId) {
      return reply.code(400).send({ statusCode: 400, message: 'Não pode seguir a si mesmo' })
    }

    const following = await fastify.redis.sIsMember(`user:${currentUserId}:following`, targetUser.id)
    if (following) {
      await Promise.all([
        fastify.redis.sRem(`user:${currentUserId}:following`, targetUser.id),
        fastify.redis.sRem(`user:${targetUser.id}:followers`, currentUserId),
      ])
      const followersCount = await fastify.redis.sCard(`user:${targetUser.id}:followers`)
      return { following: false, followersCount }
    } else {
      await Promise.all([
        fastify.redis.sAdd(`user:${currentUserId}:following`, targetUser.id),
        fastify.redis.sAdd(`user:${targetUser.id}:followers`, currentUserId),
      ])
      const followersCount = await fastify.redis.sCard(`user:${targetUser.id}:followers`)
      return { following: true, followersCount }
    }
  })

  fastify.get('/:username/followers', {
    schema: {
      params: z.object({ username: z.string() }),
      querystring: z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(50).default(20),
      }),
      response: {
        200: usersListResponse,
        404: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    const { username } = request.params as { username: string }
    const { page, limit } = request.query as any

    const targetUser = await fastify.redis.hGetAll(`user:username:${username}`)
    if (!targetUser.id) {
      return reply.code(404).send({ statusCode: 404, message: 'Usuário não encontrado' })
    }

    const followers = await fastify.redis.sMembers(`user:${targetUser.id}:followers`)
    const users = []

    for (const followerId of followers.slice((page - 1) * limit, page * limit)) {
      const user = await fastify.redis.hGetAll(`user:id:${followerId}`)
      if (user.id) {
        users.push({
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl || null,
          bio: user.bio || null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })
      }
    }

    return {
      data: users,
      meta: {
        page,
        limit,
        total: followers.length,
        totalPages: Math.ceil(followers.length / limit),
        hasNext: page * limit < followers.length,
        hasPrev: page > 1,
      },
    }
  })

  fastify.get('/:username/following', {
    schema: {
      params: z.object({ username: z.string() }),
      querystring: z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(50).default(20),
      }),
      response: {
        200: usersListResponse,
        404: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    const { username } = request.params as { username: string }
    const { page, limit } = request.query as any

    const targetUser = await fastify.redis.hGetAll(`user:username:${username}`)
    if (!targetUser.id) {
      return reply.code(404).send({ statusCode: 404, message: 'Usuário não encontrado' })
    }

    const following = await fastify.redis.sMembers(`user:${targetUser.id}:following`)
    const users = []

    for (const followingId of following.slice((page - 1) * limit, page * limit)) {
      const user = await fastify.redis.hGetAll(`user:id:${followingId}`)
      if (user.id) {
        users.push({
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl || null,
          bio: user.bio || null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })
      }
    }

    return {
      data: users,
      meta: {
        page,
        limit,
        total: following.length,
        totalPages: Math.ceil(following.length / limit),
        hasNext: page * limit < following.length,
        hasPrev: page > 1,
      },
    }
  })
}