import { FastifyInstance, FastifyRequest } from "fastify";
import { createHash } from "crypto";

export class DeviceFingerprintService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  generate(request: FastifyRequest): string {
    const components = [
      request.headers["user-agent"] || "",
      request.headers["accept-language"] || "",
      request.headers["accept-encoding"] || "",
      request.headers["accept"] || "",
      // Could add more: screen resolution, timezone, etc. from client
    ].join("|");

    return createHash("sha256").update(components).digest("hex").substring(0, 32);
  }

  async register(userId: string, fingerprint: string, request: FastifyRequest): Promise<void> {
    const ipHash = createHash("sha256").update(request.ip).digest("hex").substring(0, 16);
    
    await this.fastify.redis.hSet(`device:${userId}:${fingerprint}`, {
      userAgent: request.headers["user-agent"] || "",
      ipHash,
      lastSeen: Date.now().toString(),
      createdAt: Date.now().toString(),
    });

    // Keep only last 5 devices per user
    const devices = await this.fastify.redis.keys(`device:${userId}:*`);
    if (devices.length > 5) {
      // Sort by lastSeen and remove oldest
      const deviceData = await Promise.all(devices.map(async (key) => {
        const data = await this.fastify.redis.hGetAll(key);
        return { key, lastSeen: parseInt(data.lastSeen || "0") };
      }));
      
      deviceData.sort((a, b) => a.lastSeen - b.lastSeen);
      const toRemove = deviceData.slice(0, deviceData.length - 5);
      for (const { key } of toRemove) {
        await this.fastify.redis.del(key);
      }
    }
  }

  async remove(userId: string, fingerprint: string): Promise<void> {
    await this.fastify.redis.del(`device:${userId}:${fingerprint}`);
  }

  async getDevices(userId: string): Promise<Array<{ fingerprint: string; userAgent: string; lastSeen: number }>> {
    const keys = await this.fastify.redis.keys(`device:${userId}:*`);
    const devices = await Promise.all(keys.map(async (key) => {
      const data = await this.fastify.redis.hGetAll(key);
      return {
        fingerprint: key.split(":").pop() || "",
        userAgent: data.userAgent,
        lastSeen: parseInt(data.lastSeen || "0"),
      };
    }));
    return devices.sort((a, b) => b.lastSeen - a.lastSeen);
  }

  async updateLastSeen(userId: string, fingerprint: string): Promise<void> {
    await this.fastify.redis.hSet(`device:${userId}:${fingerprint}`, "lastSeen", Date.now().toString());
  }
}
