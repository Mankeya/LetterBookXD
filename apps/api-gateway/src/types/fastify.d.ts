import "fastify";
import { TokenPayload, User, ReadingPrivacy } from "@letterbookxd/shared-types";

declare module "fastify" {
  interface FastifyRequest {
    user?: TokenPayload;
    deviceId?: string;
    csrfToken?: string;
    requestId: string;
    rateLimitKey?: string;
  }

  interface FastifyInstance {
    redis: RedisClient;
    config: import("@letterbookxd/config").Config;
    externalApi: import("../services/external-api").ExternalApiClient;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePrivacy: (privacy: ReadingPrivacy) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    rateLimit: {
      user: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
      mutation: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    };
  }
}

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttlMs?: number): Promise<"OK" | null>;
  setEx(key: string, ttlSeconds: number, value: string): Promise<"OK">;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  hGet(key: string, field: string): Promise<string | null>;
  hSet(key: string, field: string, value: string): Promise<number>;
  hGetAll(key: string): Promise<Record<string, string>>;
  hDel(key: string, ...fields: string[]): Promise<number>;
  sAdd(key: string, ...members: string[]): Promise<number>;
  sRem(key: string, ...members: string[]): Promise<number>;
  sIsMember(key: string, member: string): Promise<boolean>;
  sMembers(key: string): Promise<string[]>;
  sCard(key: string): Promise<number>;
  zAdd(key: string, score: number, value: string): Promise<number>;
  zRem(key: string, ...members: string[]): Promise<number>;
  zRange(key: string, start: number, stop: number): Promise<string[]>;
  zRevRange(key: string, start: number, stop: number): Promise<string[]>;
  zScore(key: string, member: string): Promise<string | null>;
  keys(pattern: string): Promise<string[]>;
  eval(script: string, numKeys: number, ...keys: string[]): Promise<unknown>;
  evalSha(sha: string, numKeys: number, ...keys: string[]): Promise<unknown>;
  scriptLoad(script: string): Promise<string>;
  quit(): Promise<void>;
  on(event: string, listener: (...args: unknown[]) => void): this;
}
