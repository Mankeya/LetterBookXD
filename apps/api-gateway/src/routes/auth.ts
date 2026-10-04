import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
})

const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
    email: z.string().email(),
    displayName: z.string().min(1).max(50),
    password: z.string().min(8),
  }),
})

const authResponse = z.object({
  user: z.object({
    id: z.string(),
    username: z.string(),
    email: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
    bio: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  token: z.string(),
})

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/login', {
    schema: {
      body: loginSchema.shape.body,
      response: {
        200: authResponse,
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
    const { email, password } = request.body as z.infer<typeof loginSchema.shape.body>

    const user = await fastify.redis.hGetAll(`user:email:${email}`)
    if (!user.id) {
      return reply.code(401).send({ statusCode: 401, message: 'Credenciais inválidas' })
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash)
    if (!validPassword) {
      return reply.code(401).send({ statusCode: 401, message: 'Credenciais inválidas' })
    }

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      username: user.username,
    })

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl || null,
        bio: user.bio || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    }
  })

  fastify.post('/register', {
    schema: {
      body: registerSchema.shape.body,
      response: {
        201: authResponse,
        400: z.object({
          statusCode: z.number(),
          message: z.string(),
          errors: z.array(z.object({
            field: z.string(),
            message: z.string(),
          })).optional(),
        }),
        409: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    const { username, email, displayName, password } = request.body as z.infer<typeof registerSchema.shape.body>

    const existingEmail = await fastify.redis.hGetAll(`user:email:${email}`)
    if (existingEmail.id) {
      return reply.code(409).send({ statusCode: 409, message: 'Email já cadastrado' })
    }

    const existingUsername = await fastify.redis.hGetAll(`user:username:${username}`)
    if (existingUsername.id) {
      return reply.code(409).send({ statusCode: 409, message: 'Nome de usuário já existe' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    const userData = {
      id,
      username,
      email,
      displayName,
      passwordHash,
      avatarUrl: '',
      bio: '',
      createdAt: now,
      updatedAt: now,
    }

    await Promise.all([
      fastify.redis.hSet(`user:id:${id}`, userData),
      fastify.redis.hSet(`user:email:${email}`, userData),
      fastify.redis.hSet(`user:username:${username}`, userData),
      fastify.redis.sAdd('users:all', id),
    ])

    const token = fastify.jwt.sign({ id, email, username })

    return reply.code(201).send({
      user: {
        id,
        username,
        email,
        displayName,
        avatarUrl: null,
        bio: null,
        createdAt: now,
        updatedAt: now,
      },
      token,
    })
  })

  fastify.get('/me', {
    preHandler: [fastify.authenticate],
    schema: {
      response: {
        200: z.object({
          id: z.string(),
          username: z.string(),
          email: z.string(),
          displayName: z.string(),
          avatarUrl: z.string().nullable(),
          bio: z.string().nullable(),
          createdAt: z.string(),
          updatedAt: z.string(),
        }),
        401: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    const user = await fastify.redis.hGetAll(`user:id:${request.user!.id}`)
    if (!user.id) {
      return reply.code(404).send({ statusCode: 404, message: 'Usuário não encontrado' })
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
    }
  })

  fastify.patch('/me', {
    preHandler: [fastify.authenticate],
    schema: {
      body: z.object({
        displayName: z.string().min(1).max(50).optional(),
        bio: z.string().max(500).optional(),
        avatarUrl: z.string().url().optional(),
      }),
      response: {
        200: z.object({
          id: z.string(),
          username: z.string(),
          email: z.string(),
          displayName: z.string(),
          avatarUrl: z.string().nullable(),
          bio: z.string().nullable(),
          createdAt: z.string(),
          updatedAt: z.string(),
        }),
        401: z.object({
          statusCode: z.number(),
          message: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    const { displayName, bio, avatarUrl } = request.body as any
    const userId = request.user!.id

    const updates: Record<string, string> = {}
    if (displayName !== undefined) updates.displayName = displayName
    if (bio !== undefined) updates.bio = bio
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl
    updates.updatedAt = new Date().toISOString()

    await Promise.all([
      fastify.redis.hSet(`user:id:${userId}`, updates),
      fastify.redis.hSet(`user:email:${request.user!.email}`, updates),
      fastify.redis.hSet(`user:username:${request.user!.username}`, updates),
    ])

    const user = await fastify.redis.hGetAll(`user:id:${userId}`)
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl || null,
      bio: user.bio || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  })
}