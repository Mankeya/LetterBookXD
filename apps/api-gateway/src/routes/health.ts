import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const healthResponse = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  timestamp: z.string(),
  uptime: z.number(),
  version: z.string(),
  services: z.record(z.enum(['healthy', 'unhealthy'])),
})

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', {
    schema: {
      response: {
        200: healthResponse,
      },
    },
  }, async () => {
    const redisStatus = fastify.redis.isReady ? 'healthy' : 'unhealthy'

    return {
      status: redisStatus === 'healthy' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      services: {
        redis: redisStatus,
        gateway: 'healthy',
      },
    }
  })

  fastify.get('/ready', async () => {
    const redisReady = fastify.redis.isReady
    return { ready: redisReady }
  })

  fastify.get('/live', async () => {
    return { alive: true }
  })
}