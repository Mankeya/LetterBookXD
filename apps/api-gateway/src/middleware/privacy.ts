import { FastifyReply, FastifyRequest } from "fastify";
import { ReadingPrivacy } from "@letterbookxd/shared-types";

export function privacyMiddleware(requiredPrivacy: ReadingPrivacy) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const targetUserId = (request.params as any).username 
      ? await getUserIdByUsername(request.server, (request.params as any).username)
      : (request.params as any).userId;

    if (!targetUserId) {
      return reply.code(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "User not found", requestId: request.requestId },
      });
    }

    // Own profile - always allow
    if (request.user?.sub === targetUserId) {
      return;
    }

    // Get target user privacy setting
    const privacy = await getUserPrivacy(request.server, targetUserId);

    // Check access based on privacy setting
    const hasAccess = await checkPrivacyAccess(request.server, request.user?.sub, targetUserId, privacy, requiredPrivacy);

    if (!hasAccess) {
      await request.server.auditLogger.log({
        eventType: "access.denied",
        severity: "medium",
        userId: request.user?.sub,
        ip: request.ip,
        userAgent: request.headers["user-agent"],
        metadata: { targetUserId, requiredPrivacy, actualPrivacy: privacy },
      });

      return reply.code(403).send({
        success: false,
        error: {
          code: "PRIVACY_DENIED",
          message: "This content is private",
          requestId: request.requestId,
        },
      });
    }
  };
}

async function getUserIdByUsername(server: any, username: string): Promise<string | null> {
  // In production, query database
  // For now, check Redis cache
  const cached = await server.redis.get(`user:username:${username}`);
  if (cached) return cached;

  // Fallback: would query MySQL
  return null;
}

async function getUserPrivacy(server: any, userId: string): Promise<ReadingPrivacy> {
  const cached = await server.redis.hGet(`user:${userId}`, "reading_privacy");
  if (cached) return cached as ReadingPrivacy;
  return "public"; // Default
}

async function checkPrivacyAccess(
  server: any,
  requesterId: string | undefined,
  targetId: string,
  privacy: ReadingPrivacy,
  requiredPrivacy: ReadingPrivacy
): Promise<boolean> {
  if (privacy === "public") return true;
  if (privacy === "private") return false;

  // followers only
  if (privacy === "followers" && requesterId) {
    const isFollowing = await server.redis.sIsMember(`user:${targetId}:followers`, requesterId);
    return isFollowing;
  }

  return false;
}
