import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { config } from "@letterbookxd/config";

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const requestId = request.requestId;

  // Log error
  request.log.error({
    err: error,
    requestId,
    path: request.url,
    method: request.method,
    ip: request.ip,
    userAgent: request.headers["user-agent"],
  }, "Request error");

  // Zod validation error
  if (error instanceof ZodError) {
    return reply.code(400).send({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
          code: e.code,
        })),
        requestId,
      },
    });
  }

  // Fastify validation error
  if (error.validation) {
    return reply.code(400).send({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: error.validation,
        requestId,
      },
    });
  }

  // JWT errors
  if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
    return reply.code(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: error.name === "TokenExpiredError" ? "Token expired" : "Invalid token",
        requestId,
      },
    });
  }

  // Rate limit error
  if (error.statusCode === 429) {
    return reply.code(429).send({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: error.message || "Too many requests",
        requestId,
      },
    });
  }

  // Known Fastify errors with statusCode
  if (error.statusCode && error.statusCode < 500) {
    return reply.code(error.statusCode).send({
      success: false,
      error: {
        code: error.code || "ERROR",
        message: error.message,
        requestId,
      },
    });
  }

  // Internal server error - dont leak details
  if (config.env === "production") {
    return reply.code(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        requestId,
      },
    });
  }

  // Development: show error details
  return reply.code(500).send({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: error.message,
      stack: error.stack,
      requestId,
    },
  });
}
