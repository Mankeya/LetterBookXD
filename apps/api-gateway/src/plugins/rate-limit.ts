import { FastifyPluginAsync } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { securityConfig } from "@letterbookxd/config";

export const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  // Global rate limit
  await fastify.register(rateLimit, {
    global: true,
    max: securityConfig.rateLimit.gateway.global.max,
    timeWindow: securityConfig.rateLimit.gateway.global.windowMs,
    keyGenerator: (request) => request.rateLimitKey || request.ip,
    errorMessage: "Too many requests, please try again later",
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true,
    },
    allowList: ["127.0.0.1", "::1"], // Localhost for health checks
    redis: fastify.redis as any,
    skipOnError: true,
  });

  // Auth endpoints - stricter limit
  await fastify.register(rateLimit, {
    max: securityConfig.rateLimit.gateway.auth.max,
    timeWindow: securityConfig.rateLimit.gateway.auth.windowMs,
    keyGenerator: (request) => `auth:${request.ip}`,
    errorMessage: "Too many authentication attempts, please try again later",
    addHeaders: true,
    redis: fastify.redis as any,
    skipOnError: true,
  });

  // Search endpoints
  await fastify.register(rateLimit, {
    max: securityConfig.rateLimit.gateway.search.max,
    timeWindow: securityConfig.rateLimit.gateway.search.windowMs,
    keyGenerator: (request) => `search:${request.ip}`,
    errorMessage: "Search rate limit exceeded",
    addHeaders: true,
    redis: fastify.redis as any,
    skipOnError: true,
  });
};
