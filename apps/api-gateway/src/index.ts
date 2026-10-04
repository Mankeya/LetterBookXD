import Fastify from 'fastify'
import { config } from '@letterbookxd/config'
import { corsPlugin } from './plugins/cors.js'
import { helmetPlugin } from './plugins/helmet.js'
import { rateLimitPlugin } from './plugins/rate-limit.js'
import { jwtPlugin } from './plugins/jwt.js'
import { redisPlugin } from './plugins/redis.js'
import { swaggerPlugin } from './plugins/swagger.js'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'
import { movieRoutes } from './routes/movies.js'
import { reviewRoutes } from './routes/reviews.js'
import { userRoutes } from './routes/users.js'
import { errorHandler } from './middleware/error-handler.js'
import { authMiddleware } from './middleware/auth.js'

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
})

fastify.setErrorHandler(errorHandler)

await fastify.register(corsPlugin)
await fastify.register(helmetPlugin)
await fastify.register(rateLimitPlugin)
await fastify.register(jwtPlugin)
await fastify.register(redisPlugin)
await fastify.register(swaggerPlugin)

fastify.decorate('authenticate', authMiddleware)

await fastify.register(healthRoutes, { prefix: '/health' })
await fastify.register(authRoutes, { prefix: '/auth' })
await fastify.register(movieRoutes, { prefix: '/movies' })
await fastify.register(reviewRoutes, { prefix: '/reviews' })
await fastify.register(userRoutes, { prefix: '/users' })

const start = async () => {
  try {
    await fastify.listen({ port: 8080, host: '0.0.0.0' })
    fastify.log.info(`API Gateway rodando em http://localhost:8080`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()