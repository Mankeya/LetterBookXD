import { FastifyInstance } from "fastify";
import { securityConfig } from "@letterbookxd/config";

export class TokenBlacklistService {
  private fastify: FastifyInstance;
  private prefix: string;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.prefix = securityConfig.jwt.blacklistPrefix;
  }

  async add(jti: string, ttlMs: number): Promise<void> {
    const ttlSeconds = Math.ceil(ttlMs / 1000);
    await this.fastify.redis.setEx(`${this.prefix}${jti}`, ttlSeconds, "1");
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    const result = await this.fastify.redis.get(`${this.prefix}${jti}`);
    return result === "1";
  }

  async remove(jti: string): Promise<void> {
    await this.fastify.redis.del(`${this.prefix}${jti}`);
  }

  async blacklistAllUserTokens(userId: string): Promise<void> {
    // In production, you'd store userId -> JTI mapping
    // For now, this is a placeholder
    this.fastify.log.info({ event: "token.blacklist_all", userId }, "Blacklisting all user tokens");
  }
}
