import { FastifyPluginAsync } from "fastify";
import helmet from "@fastify/helmet";
import { securityConfig } from "@letterbookxd/config";

export const helmetPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(helmet, {
    contentSecurityPolicy: securityConfig.helmet.contentSecurityPolicy
      ? {
          directives: securityConfig.csp.directives,
          reportOnly: securityConfig.csp.reportOnly,
        }
      : false,
    crossOriginEmbedderPolicy: securityConfig.helmet.crossOriginEmbedderPolicy,
    crossOriginOpenerPolicy: securityConfig.helmet.crossOriginOpenerPolicy,
    crossOriginResourcePolicy: securityConfig.helmet.crossOriginResourcePolicy,
    dnsPrefetchControl: securityConfig.helmet.dnsPrefetchControl,
    frameguard: securityConfig.helmet.frameguard,
    hidePoweredBy: securityConfig.helmet.hidePoweredBy,
    hsts: securityConfig.helmet.hsts,
    ieNoOpen: securityConfig.helmet.ieNoOpen,
    noSniff: securityConfig.helmet.noSniff,
    referrerPolicy: securityConfig.helmet.referrerPolicy,
    xssFilter: securityConfig.helmet.xssFilter,
  });
};
