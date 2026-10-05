import { FastifyPluginAsync } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { config } from "@letterbookxd/config";
import { securityConfig } from "@letterbookxd/config";

export const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "LetterBookXD API",
        description: "Books & Manga Social Network API",
        version: "1.0.0",
        contact: {
          name: "LetterBookXD Team",
          email: "api@letterbookxd.com",
        },
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT",
        },
      },
      servers: [
        { url: config.app.apiUrl, description: "API Gateway" },
        { url: "http://localhost:8080", description: "Local Development" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT Access Token (HS256, 15min expiry)",
          },
          refreshToken: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT Refresh Token (30d expiry, rotating)",
          },
          csrfToken: {
            type: "apiKey",
            in: "header",
            name: "x-csrf-token",
            description: "CSRF Token for mutations",
          },
        },
        schemas: {
          Error: {
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              error: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  message: { type: "string" },
                  details: { type: "object" },
                  requestId: { type: "string" },
                },
              },
            },
          },
          PaginationMeta: {
            type: "object",
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" },
              hasNext: { type: "boolean" },
              hasPrev: { type: "boolean" },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      tags: [
        { name: "Health", description: "Health checks" },
        { name: "Auth", description: "Authentication & Authorization" },
        { name: "Search", description: "Unified search across books & manga" },
        { name: "Books", description: "Open Library book proxy" },
        { name: "Manga", description: "MangaDex manga proxy" },
        { name: "Reading List", description: "User reading lists (protected)" },
        { name: "Social", description: "Follows, feed, profiles" },
        { name: "Users", description: "Public user profiles" },
      ],
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
    staticCSP: true,
    transformSpec: (swaggerObject) => swaggerObject,
  });
};
