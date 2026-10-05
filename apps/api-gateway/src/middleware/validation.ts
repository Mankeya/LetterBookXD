import { FastifyReply, FastifyRequest } from "fastify";
import { ZodSchema } from "zod";

export function validateBody<T>(schema: ZodSchema<T>) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof Error) {
        throw error; // Let global error handler process ZodError
      }
      throw error;
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      request.query = schema.parse(request.query);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw error;
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      request.params = schema.parse(request.params);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw error;
    }
  };
}

export function validateHeaders<T>(schema: ZodSchema<T>) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      request.headers = schema.parse(request.headers);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw error;
    }
  };
}
