import { FastifyPluginAsync } from "fastify";
import csrf from "@fastify/csrf";
import { config } from "@letterbookxd/config";
import { securityConfig } from "@letterbookxd/config";

export const csrfPlugin: FastifyPluginAsync = async (fastify) => {
  if (!securityConfig.session.csrf.enabled) return;

  await fastify.register(csrf, {
    sessionPlugin: "@fastify/cookie",
    cookieName: securityConfig.session.csrf.cookieName,
    cookieOpts: securityConfig.session.csrf.cookieOptions,
    headerName: securityConfig.session.csrf.headerName,
    getToken: (request) => {
      // Check header first, then cookie
      return request.headers[securityConfig.session.csrf.headerName] ||
             request.cookies[securityConfig.session.csrf.cookieName];
    },
  });

  // Generate CSRF token endpoint
  fastify.get("/csrf-token", async (request, reply) => {
    const token = fastify.csrf.generate();
    reply.setCookie(securityConfig.session.csrf.cookieName, token, securityConfig.session.csrf.cookieOptions);
    return { csrfToken: token };
  });
};
