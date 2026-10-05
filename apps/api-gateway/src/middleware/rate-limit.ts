import { FastifyRequest, FastifyReply } from "fastify";
import { securityConfig } from "@letterbookxd/config";

const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Remove expired entries
redis.call("ZREMRANGEBYSCORE", key, 0, now - window)

-- Count current requests
local count = redis.call("ZCARD", key)

if count >= limit then
  local ttl = redis.call("ZSCORE", key, redis.call("ZRANGE", key, 0, 0)[1])
  return {0, limit, count, ttl and (ttl + window - now) or window}
end

-- Add current request
redis.call("ZADD", key, now, now .. "-" .. math.random(1000000))
redis.call("EXPIRE", key, math.ceil(window / 1000) + 1)

return {1, limit, count + 1, window}
`;

export const rateLimitMiddleware = {
  user: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const userId = request.user?.sub;
    if (!userId) {
      return reply.code(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required", requestId: request.requestId },
      });
    }

    await checkRateLimit(request, reply, `ratelimit:user:${userId}`, securityConfig.rateLimit.user.api);
  },

  mutation: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const userId = request.user?.sub;
    if (!userId) {
      return reply.code(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required", requestId: request.requestId },
      });
    }

    await checkRateLimit(request, reply, `ratelimit:mutation:${userId}`, securityConfig.rateLimit.user.mutations);
  },
};

async function checkRateLimit(
  request: FastifyRequest,
  reply: FastifyReply,
  key: string,
  config: { max: number; windowMs: number }
): Promise<void> {
  const now = Date.now();
  const result = await request.server.redis.eval(RATE_LIMIT_SCRIPT, 1, key, config.max.toString(), config.windowMs.toString(), now.toString()) as number[];

  const [allowed, limit, remaining, reset] = result;
  const resetSeconds = Math.ceil(reset / 1000);

  // Set headers
  reply.header("X-RateLimit-Limit", limit);
  reply.header("X-RateLimit-Remaining", Math.max(0, remaining));
  reply.header("X-RateLimit-Reset", Math.floor((now + reset) / 1000));

  if (!allowed) {
    reply.header("Retry-After", resetSeconds);
    return reply.code(429).send({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Rate limit exceeded",
        requestId: request.requestId,
      },
    });
  }
}
