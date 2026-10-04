import { FastifyPluginAsync } from 'fastify'
import jwt from '@fastify/jwt'
import { config } from '@letterbookxd/config'

export const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(jwt, {
    secret: config.jwt.secret,
    sign: { expiresIn: config.jwt.expiresIn },
    verify: { maxAge: config.jwt.expiresIn },
  })

  fastify.decorate('verifyToken', async (request: any, reply: any) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.code(401).send({ message: 'Token inválido ou expirado' })
    }
  })
}