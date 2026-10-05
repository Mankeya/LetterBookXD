import { FastifyInstance } from "fastify";
import { securityConfig } from "@letterbookxd/config";

interface AuditLogEntry {
  eventType: string;
  severity: "low" | "medium" | "high" | "critical";
  userId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

export class AuditLogger {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  async log(entry: AuditLogEntry): Promise<void> {
    const logEntry = {
      ...entry,
      timestamp: entry.timestamp || Date.now(),
      service: "api-gateway",
      environment: process.env.NODE_ENV || "development",
    };

    // Log to Loki via Pino
    const logLevel = this.severityToLogLevel(entry.severity);
    this.fastify.log[logLevel](logEntry, `Security event: ${entry.eventType}`);

    // Also store in Redis for real-time dashboard (last 1000 events)
    await this.storeInRedis(logEntry);
  }

  private severityToLogLevel(severity: string): "info" | "warn" | "error" | "fatal" {
    switch (severity) {
      case "low": return "info";
      case "medium": return "warn";
      case "high": return "error";
      case "critical": return "fatal";
      default: return "info";
    }
  }

  private async storeInRedis(entry: AuditLogEntry): Promise<void> {
    const key = "audit:events";
    const score = entry.timestamp || Date.now();
    const value = JSON.stringify(entry);

    await this.fastify.redis.zAdd(key, { score, value });
    await this.fastify.redis.zRemRangeByRank(key, 0, -1001); // Keep last 1000
    await this.fastify.redis.expire(key, 86400); // 24h TTL
  }

  // Convenience methods for common events
  async logAuthSuccess(userId: string, request: any): Promise<void> {
    await this.log({
      eventType: securityConfig.securityEvents.AUTH_LOGIN_SUCCESS,
      severity: "low",
      userId,
      ip: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: { deviceId: request.deviceId },
    });
  }

  async logAuthFailure(request: any, reason: string): Promise<void> {
    await this.log({
      eventType: securityConfig.securityEvents.AUTH_LOGIN_FAILURE,
      severity: "medium",
      ip: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: { reason },
    });
  }

  async logRateLimitExceeded(request: any, identifier: string): Promise<void> {
    await this.log({
      eventType: securityConfig.securityEvents.RATE_LIMIT_EXCEEDED,
      severity: "medium",
      ip: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: { identifier },
    });
  }

  async logInjectionAttempt(request: any, type: "sql" | "nosql" | "command", payload: string): Promise<void> {
    await this.log({
      eventType: securityConfig.securityEvents[`INJECTION_${type.toUpperCase()}` as keyof typeof securityConfig.securityEvents],
      severity: "high",
      ip: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: { payload: payload.substring(0, 500) },
    });
  }

  async logSsrfAttempt(request: any, targetUrl: string, blocked: boolean): Promise<void> {
    await this.log({
      eventType: securityConfig.securityEvents.SSRF_ATTEMPT,
      severity: blocked ? "medium" : "critical",
      ip: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: { targetUrl, blocked },
    });
  }

  async logAccessDenied(request: any, reason: string): Promise<void> {
    await this.log({
      eventType: securityConfig.securityEvents.ACCESS_DENIED,
      severity: "medium",
      userId: request.user?.sub,
      ip: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: { reason },
    });
  }

  async logDataExport(request: any, format: string): Promise<void> {
    await this.log({
      eventType: securityConfig.securityEvents.DATA_EXPORT_REQUESTED,
      severity: "medium",
      userId: request.user?.sub,
      ip: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: { format },
    });
  }

  async logDataDeletion(request: any): Promise<void> {
    await this.log({
      eventType: securityConfig.securityEvents.DATA_DELETION_REQUESTED,
      severity: "high",
      userId: request.user?.sub,
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    });
  }
}
