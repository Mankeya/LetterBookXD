import { FastifyPluginAsync } from "fastify";
import cookie from "@fastify/cookie";
import { config } from "@letterbookxd/config";
import { securityConfig } from "@letterbookxd/config";

export const cookiePlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cookie, {
    secret: config.jwt.secret, // Used for signed cookies
    hook: "onRequest",
    parseOptions: {
      httpOnly: securityConfig.session.cookie.httpOnly,
      secure: securityConfig.session.cookie.secure,
      sameSite: securityConfig.session.cookie.sameSite,
      path: securityConfig.session.cookie.path,
      maxAge: securityConfig.session.cookie.maxAge,
    },
  });
};
