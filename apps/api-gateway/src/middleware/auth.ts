import { FastifyRequest, FastifyReply } from 'fastify'
import { config } from '@letterbookxd/config'

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    return reply.code(401).send({
      statusCode: 401,
      message: 'Token inválido ou expirado',
    })
  }
}

export function optionalAuth(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  const authHeader = request.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return done()
  }

  const token = authHeader.substring(7)

  try {
    const decoded = request.server.jwt.verify(token)
    request.user = decoded
    done()
  } catch {
    done()
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string
      email: string
      username: string
    }
  }
}