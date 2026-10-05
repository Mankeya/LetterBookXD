import { FastifyPluginAsync } from "fastify";
import jwt from "@fastify/jwt";
import { config } from "@letterbookxd/config";
import { securityConfig } from "@letterbookxd/config";

export const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(jwt, {
    secret: config.jwt.secret,
    sign: {
      algorithm: securityConfig.jwt.algorithm,
      expiresIn: securityConfig.jwt.accessTokenTtl,
      issuer: securityConfig.jwt.issuer,
      audience: securityConfig.jwt.audience,
    },
    verify: {
      algorithm: securityConfig.jwt.algorithm,
      issuer: securityConfig.jwt.issuer,
      audience: securityConfig.jwt.audience,
      maxAge: securityConfig.jwt.accessTokenTtl,
    },
    cookie: {
      cookieName: "access_token",
      signed: false,
      secure: config.env === "production",
      httpOnly: true,
      sameSite: "strict",
    },
  });

  // Decorate with token verification
  fastify.decorate("verifyToken", async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid or expired token", requestId: request.requestId },
      });
    }
  });
};
