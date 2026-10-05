import { FastifyReply, FastifyRequest } from "fastify";
import { config } from "@letterbookxd/config";
import { securityConfig } from "@letterbookxd/config";

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // Verify access token
    await request.jwtVerify();

    // Check if token is blacklisted
    const jti = request.user?.jti;
    if (jti) {
      const blacklisted = await request.server.redis.get(`${securityConfig.jwt.blacklistPrefix}${jti}`);
      if (blacklisted) {
        return reply.code(401).send({
          success: false,
          error: { code: "TOKEN_REVOKED", message: "Token has been revoked", requestId: request.requestId },
        });
      }
    }

    // Verify device fingerprint
    if (securityConfig.session.deviceFingerprint.enabled) {
      const deviceId = request.deviceId;
      if (deviceId && request.user?.deviceId !== deviceId) {
        request.log.warn({
          event: "auth.device_mismatch",
          userId: request.user?.sub,
          tokenDeviceId: request.user?.deviceId,
          requestDeviceId: deviceId,
        }, "Device fingerprint mismatch");
        // Could revoke token here, but for now just log
      }
    }

    // Check IP binding
    if (securityConfig.session.ipBinding.enabled) {
      const tokenIpPrefix = request.user?.ip?.split(".").slice(0, securityConfig.session.ipBinding.cidrMask / 8).join(".");
      const requestIpPrefix = request.ip.split(".").slice(0, securityConfig.session.ipBinding.cidrMask / 8).join(".");
      if (tokenIpPrefix && tokenIpPrefix !== requestIpPrefix) {
        request.log.warn({
          event: "auth.ip_mismatch",
          userId: request.user?.sub,
          tokenIpPrefix,
          requestIpPrefix,
        }, "IP prefix mismatch");
      }
    }

  } catch (err: any) {
    // Token expired
    if (err.name === "TokenExpiredError") {
      return reply.code(401).send({
        success: false,
        error: { code: "TOKEN_EXPIRED", message: "Access token expired", requestId: request.requestId },
      });
    }
    // Invalid token
    return reply.code(401).send({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid token", requestId: request.requestId },
    });
  }
}

export async function optionalAuthMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return; // No token, continue as guest
  }

  try {
    const token = authHeader.substring(7);
    const decoded = request.server.jwt.verify(token);
    request.user = decoded;
  } catch {
    // Invalid token, continue as guest
  }
}
