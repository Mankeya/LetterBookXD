import { FastifyPluginAsync } from 'fastify'
import { createClient, RedisClientType } from 'redis'
import { config } from '@letterbookxd/config'

declare module 'fastify' {
  interface FastifyInstance {
    redis: RedisClientType
  }
}

export const redisPlugin: FastifyPluginAsync = async (fastify) => {
  const client = createClient({
    url: config.redis.url,
  })

  client.on('error', (err) => fastify.log.error(err, 'Redis Client Error'))
  client.on('connect', () => fastify.log.info('Redis conectado'))
  client.on('ready', () => fastify.log.info('Redis pronto'))
  client.on('reconnecting', () => fastify.log.info('Redis reconectando...'))

  await client.connect()

  fastify.decorate('redis', client)

  fastify.addHook('onClose', async (instance) => {
    await instance.redis.quit()
  })
}