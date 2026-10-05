import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";

export const requestIdMiddleware: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.headers["x-request-id"] as string || generateRequestId();
    request.requestId = requestId;
    reply.header("X-Request-ID", requestId);
  });
};

function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `req_${timestamp}_${random}`;
}

export function getRequestId(request: FastifyRequest): string {
  return request.requestId || generateRequestId();
}
