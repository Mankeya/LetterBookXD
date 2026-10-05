import Fastify, { FastifyInstance } from "fastify";
import { config } from "@letterbookxd/config";
import { securityConfig } from "@letterbookxd/config";

// Plugins
import { corsPlugin } from "./plugins/cors.js";
import { helmetPlugin } from "./plugins/helmet.js";
import { rateLimitPlugin } from "./plugins/rate-limit.js";
import { jwtPlugin } from "./plugins/jwt.js";
import { redisPlugin } from "./plugins/redis.js";
import { swaggerPlugin } from "./plugins/swagger.js";
import { cookiePlugin } from "./plugins/cookie.js";
import { csrfPlugin } from "./plugins/csrf.js";

// Routes
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { searchRoutes } from "./routes/search.js";
import { booksRoutes } from "./routes/books.js";
import { mangaRoutes } from "./routes/manga.js";
import { readingListRoutes } from "./routes/reading-list.js";
import { socialRoutes } from "./routes/social.js";
import { usersRoutes } from "./routes/users.js";

// Middlewares
import { errorHandler } from "./middleware/error-handler.js";
import { authMiddleware } from "./middleware/auth.js";
import { optionalAuthMiddleware } from "./middleware/optional-auth.js";
import { csrfMiddleware } from "./middleware/csrf.js";
import { privacyMiddleware } from "./middleware/privacy.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";

// Services
import { ExternalApiClient } from "./services/external-api.js";
import { DeviceFingerprintService } from "./services/device-fingerprint.js";
import { TokenBlacklistService } from "./services/token-blacklist.js";
import { AuditLogger } from "./services/audit-logger.js";

// Utils
import { generateRequestId } from "./utils/request-id.js";

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logging.level,
      transport: config.env === "development" ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      } : undefined,
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.headers.x-csrf-token",
          "req.body.password",
          "req.body.passwordHash",
          "req.body.token",
          "req.body.refreshToken",
          "res.headers.set-cookie",
        ],
        censor: "[REDACTED]",
      },
    },
    ajv: {
      customOptions: {
        strict: true,
        allErrors: true,
        removeAdditional: true,
        useDefaults: true,
        coerceTypes: "array",
      },
    },
  });

  // Request ID
  await app.register(requestIdMiddleware);

  // Security plugins
  await app.register(corsPlugin);
  await app.register(helmetPlugin);
  await app.register(cookiePlugin);
  await app.register(csrfPlugin);
  await app.register(rateLimitPlugin);
  await app.register(jwtPlugin);
  await app.register(redisPlugin);
  await app.register(swaggerPlugin);

  // Initialize services
  const externalApi = new ExternalApiClient(app);
  const deviceFingerprint = new DeviceFingerprintService(app);
  const tokenBlacklist = new TokenBlacklistService(app);
  const auditLogger = new AuditLogger(app);

  // Decorate app with services
  app.decorate("externalApi", externalApi);
  app.decorate("deviceFingerprint", deviceFingerprint);
  app.decorate("tokenBlacklist", tokenBlacklist);
  app.decorate("auditLogger", auditLogger);

  // Auth middlewares
  app.decorate("authenticate", authMiddleware);
  app.decorate("optionalAuth", optionalAuthMiddleware);
  app.decorate("requirePrivacy", privacyMiddleware);

  // Rate limit middlewares
  app.decorate("rateLimit", {
    user: rateLimitMiddleware.user,
    mutation: rateLimitMiddleware.mutation,
  });

  // CSRF protection for mutations
  await app.register(csrfMiddleware);

  // Health check (no auth, no rate limit)
  await app.register(healthRoutes, { prefix: "/health" });

  // Auth routes (strict rate limit)
  await app.register(authRoutes, { prefix: "/auth" });

  // Public routes with rate limiting
  await app.register(searchRoutes, { prefix: "/search" });
  await app.register(booksRoutes, { prefix: "/books" });
  await app.register(mangaRoutes, { prefix: "/manga" });
  await app.register(usersRoutes, { prefix: "/users" });

  // Protected routes (require auth)
  await app.register(readingListRoutes, { prefix: "/reading-list" });
  await app.register(socialRoutes, { prefix: "/" }); // follows, feed

  // Global error handler
  app.setErrorHandler(errorHandler);

  // 404 handler
  app.setNotFoundHandler(async (request, reply) => {
    await app.auditLogger.log({
      eventType: "access.denied",
      severity: "low",
      userId: request.user?.sub,
      ip: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: { path: request.url, method: request.method },
    });
    return reply.code(404).send({
      success: false,
      error: { code: "NOT_FOUND", message: "Route not found", requestId: request.requestId },
    });
  });

  return app;
}

async function start() {
  try {
    const app = await buildApp();
    const port = config.env === "production" ? 8080 : 8080;
    const host = "0.0.0.0";

    await app.listen({ port, host });
    app.log.info(`?? API Gateway running at http://${host}:${port}`);
    app.log.info(`?? Swagger docs: http://${host}:${port}/docs`);
    app.log.info(`?? Health check: http://${host}:${port}/health`);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  process.exit(0);
});

start();
