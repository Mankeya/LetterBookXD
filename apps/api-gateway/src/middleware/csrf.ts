import { FastifyReply, FastifyRequest } from "fastify";
import { securityConfig } from "@letterbookxd/config";

export async function csrfMiddleware(fastify: any): Promise<void> {
  if (!securityConfig.session.csrf.enabled) return;

  fastify.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip CSRF for safe methods
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      return;
    }

    // Skip for auth endpoints (they use rate limiting instead)
    if (request.url.startsWith("/auth/")) {
      return;
    }

    // Skip for health checks
    if (request.url.startsWith("/health")) {
      return;
    }

    // Verify CSRF token
    const headerToken = request.headers[securityConfig.session.csrf.headerName];
    const cookieToken = request.cookies[securityConfig.session.csrf.cookieName];

    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return reply.code(403).send({
        success: false,
        error: {
          code: "CSRF_INVALID",
          message: "Invalid or missing CSRF token",
          requestId: request.requestId,
        },
      });
    }
  });
}
