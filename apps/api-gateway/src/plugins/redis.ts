import { FastifyPluginAsync } from "fastify";
import { createClient, RedisClientType } from "redis";
import { config } from "@letterbookxd/config";

declare module "fastify" {
  interface FastifyInstance {
    redis: RedisClientType;
  }
}

export const redisPlugin: FastifyPluginAsync = async (fastify) => {
  const client = createClient({
    url: config.redis.url,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          fastify.log.error("Redis max retries reached");
          return new Error("Redis max retries reached");
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  client.on("error", (err) => fastify.log.error({ err, event: "redis.error" }, "Redis error"));
  client.on("connect", () => fastify.log.info({ event: "redis.connect" }, "Redis connected"));
  client.on("ready", () => fastify.log.info({ event: "redis.ready" }, "Redis ready"));
  client.on("reconnecting", () => fastify.log.warn({ event: "redis.reconnecting" }, "Redis reconnecting"));

  await client.connect();

  fastify.decorate("redis", client);

  fastify.addHook("onClose", async (instance) => {
    await instance.redis.quit();
  });
};
