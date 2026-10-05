import { FastifyPluginAsync } from "fastify";
import cors from "@fastify/cors";
import { config } from "@letterbookxd/config";

export const corsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cors, {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      const allowed = config.cors.origin;
      if (allowed.includes(origin)) {
        return callback(null, true);
      }
      
      // Log blocked origin for security monitoring
      fastify.log.warn({ event: "cors.blocked", origin }, "CORS blocked origin");
      return callback(new Error("CORS not allowed"), false);
    },
    credentials: config.cors.credentials,
    methods: config.cors.methods,
    allowedHeaders: config.cors.allowedHeaders,
    exposedHeaders: config.cors.exposedHeaders,
    maxAge: config.cors.maxAge,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
};
