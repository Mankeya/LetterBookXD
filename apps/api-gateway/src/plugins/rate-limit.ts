import { FastifyPluginAsync } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import { config } from '@letterbookxd/config'

export const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rateLimit, {
    max: config.rateLimit.maxRequests,
    timeWindow: config.rateLimit.windowMs,
    keyGenerator: (request) => request.ip,
    errorMessage: 'Muitas requisições, tente novamente mais tarde',
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
  })
}