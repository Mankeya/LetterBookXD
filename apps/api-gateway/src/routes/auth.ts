import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { config } from "@letterbookxd/config";
import { securityConfig } from "@letterbookxd/config";
import { ReadingPrivacy } from "@letterbookxd/shared-types";

const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
    email: z.string().email(),
    password: z.string().min(12).max(128),
    displayName: z.string().min(1).max(100),
    readingLanguage: z.array(z.string()).optional().default(["pt-BR", "en"]),
    lgpdConsent: z.object({
      essential: z.literal(true),
      analytics: z.boolean().default(false),
      marketing: z.boolean().default(false),
      thirdParty: z.boolean().default(false),
    }),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
    rememberMe: z.boolean().optional().default(false),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    displayName: z.string().min(1).max(100).optional(),
    bio: z.string().max(500).optional(),
    avatarUrl: z.string().url().optional(),
    readingPrivacy: z.enum(["public", "followers", "private"]).optional(),
    readingLanguage: z.array(z.string()).optional(),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(12).max(128),
  }),
});

function generateTokens(fastify: any, user: any, deviceId: string) {
  const accessToken = fastify.jwt.sign({
    sub: user.id,
    email: user.email,
    username: user.username,
    deviceId,
    scopes: ["read", "write", "social"],
    jti: uuidv4(),
  });

  const refreshToken = fastify.jwt.sign({
    sub: user.id,
    type: "refresh",
    deviceId,
    jti: uuidv4(),
  }, { expiresIn: securityConfig.jwt.refreshTokenTtl });

  return { accessToken, refreshToken };
}

async function storeRefreshToken(fastify: any, userId: string, deviceId: string, refreshToken: string, userAgent: string, ip: string) {
  const tokenHash = await bcrypt.hash(refreshToken, 12);
  const jti = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await fastify.redis.hSet(`refresh:${userId}:${deviceId}:${jti}`, {
    tokenHash,
    userAgent,
    ip,
    createdAt: Date.now().toString(),
    expiresAt: expiresAt.getTime().toString(),
  });
  await fastify.redis.expire(`refresh:${userId}:${deviceId}:${jti}`, 30 * 24 * 60 * 60);
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // REGISTER
  fastify.post("/register", {
    schema: { body: registerSchema.shape.body },
  }, async (request, reply) => {
    const { username, email, password, displayName, readingLanguage, lgpdConsent } = request.body;
    const deviceId = request.deviceId!;
    const ip = request.ip;

    // Check if username exists
    const existingUsername = await fastify.redis.get(`user:username:${username}`);
    if (existingUsername) {
      await fastify.auditLogger.logAuthFailure(request, "username_exists");
      return reply.code(409).send({
        success: false,
        error: { code: "USERNAME_EXISTS", message: "Username already taken", requestId: request.requestId },
      });
    }

    // Check if email exists
    const existingEmail = await fastify.redis.get(`user:email:${email}`);
    if (existingEmail) {
      await fastify.auditLogger.logAuthFailure(request, "email_exists");
      return reply.code(409).send({
        success: false,
        error: { code: "EMAIL_EXISTS", message: "Email already registered", requestId: request.requestId },
      });
    }

    // Check breached passwords
    if (securityConfig.password.breachCheck.enabled) {
      // In production, call HaveIBeenPwned API
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, securityConfig.password.cost);

    // Create user
    const userId = uuidv4();
    const now = new Date().toISOString();

    const user = {
      id: userId,
      username,
      email,
      passwordHash,
      displayName,
      avatarUrl: "",
      bio: "",
      readingPrivacy: "public" as ReadingPrivacy,
      readingLanguage: JSON.stringify(readingLanguage),
      emailVerified: false,
      lgpdConsent: JSON.stringify(lgpdConsent),
      createdAt: now,
      updatedAt: now,
    };

    // Store user
    await Promise.all([
      fastify.redis.hSet(`user:id:${userId}`, user),
      fastify.redis.set(`user:username:${username}`, userId),
      fastify.redis.set(`user:email:${email}`, userId),
      fastify.redis.sAdd("users:all", userId),
    ]);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(fastify, user, deviceId);
    await storeRefreshToken(fastify, userId, deviceId, refreshToken, request.headers["user-agent"] || "", ip);

    // Set cookies
    reply.setCookie("access_token", accessToken, {
      httpOnly: true,
      secure: config.env === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
      path: "/",
    });
    reply.setCookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: config.env === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    // Log success
    await fastify.auditLogger.logAuthSuccess(userId, request);

    return reply.code(201).send({
      success: true,
      data: {
        user: {
          id: userId,
          username,
          email,
          displayName,
          avatarUrl: null,
          bio: null,
          readingPrivacy: "public",
          readingLanguage,
          createdAt: now,
          updatedAt: now,
        },
        accessToken,
        refreshToken,
      },
    });
  });

  // LOGIN
  fastify.post("/login", {
    schema: { body: loginSchema.shape.body },
  }, async (request, reply) => {
    const { email, password, rememberMe } = request.body;
    const deviceId = request.deviceId!;
    const ip = request.ip;

    // Find user by email
    const userId = await fastify.redis.get(`user:email:${email}`);
    if (!userId) {
      await fastify.auditLogger.logAuthFailure(request, "invalid_credentials");
      return reply.code(401).send({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password", requestId: request.requestId },
      });
    }

    const user = await fastify.redis.hGetAll(`user:id:${userId}`);
    if (!user.id) {
      await fastify.auditLogger.logAuthFailure(request, "user_not_found");
      return reply.code(401).send({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password", requestId: request.requestId },
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      // Increment failed attempts
      const attempts = await fastify.redis.incr(`auth:failed:${ip}`);
      if (attempts >= 5) {
        await fastify.redis.expire(`auth:failed:${ip}`, 15 * 60); // Lock for 15 min
      }
      await fastify.auditLogger.logAuthFailure(request, "invalid_password");
      return reply.code(401).send({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password", requestId: request.requestId },
      });
    }

    // Reset failed attempts
    await fastify.redis.del(`auth:failed:${ip}`);

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return reply.code(403).send({
        success: false,
        error: { code: "ACCOUNT_LOCKED", message: "Account temporarily locked", requestId: request.requestId },
      });
    }

    // Update last login
    const now = new Date().toISOString();
    await fastify.redis.hSet(`user:id:${userId}`, { lastLoginAt: now, lastLoginIp: ip });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(fastify, user, deviceId);
    await storeRefreshToken(fastify, userId, deviceId, refreshToken, request.headers["user-agent"] || "", ip);

    // Register device
    await fastify.deviceFingerprint.register(userId, deviceId, request);

    // Set cookies
    reply.setCookie("access_token", accessToken, {
      httpOnly: true,
      secure: config.env === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
      path: "/",
    });
    reply.setCookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: config.env === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    // Log success
    await fastify.auditLogger.logAuthSuccess(userId, request);

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl || null,
          bio: user.bio || null,
          readingPrivacy: user.readingPrivacy,
          readingLanguage: JSON.parse(user.readingLanguage || "[]"),
          createdAt: user.createdAt,
          updatedAt: now,
        },
        accessToken,
        refreshToken,
      },
    };
  });

  // REFRESH TOKEN
  fastify.post("/refresh", {
    schema: { body: refreshSchema.shape.body },
  }, async (request, reply) => {
    const refreshToken = request.body.refreshToken || request.cookies.refresh_token;
    const deviceId = request.deviceId!;

    if (!refreshToken) {
      return reply.code(401).send({
        success: false,
        error: { code: "MISSING_REFRESH_TOKEN", message: "Refresh token required", requestId: request.requestId },
      });
    }

    // Find the refresh token
    const keys = await fastify.redis.keys("refresh:*:*:*");
    let found = false;
    let userId = "";
    let tokenKey = "";

    for (const key of keys) {
      const data = await fastify.redis.hGetAll(key);
      if (data.tokenHash && await bcrypt.compare(refreshToken, data.tokenHash)) {
        // Check expiry
        if (parseInt(data.expiresAt) < Date.now()) {
          await fastify.redis.del(key);
          return reply.code(401).send({
            success: false,
            error: { code: "REFRESH_TOKEN_EXPIRED", message: "Refresh token expired", requestId: request.requestId },
          });
        }
        found = true;
        userId = key.split(":")[1];
        tokenKey = key;
        break;
      }
    }

    if (!found) {
      await fastify.auditLogger.log({ eventType: "auth.token_revoked", severity: "high", ip: request.ip, metadata: { reason: "refresh_token_not_found" } });
      return reply.code(401).send({
        success: false,
        error: { code: "INVALID_REFRESH_TOKEN", message: "Invalid refresh token", requestId: request.requestId },
      });
    }

    // Rotate refresh token (single-use)
    await fastify.redis.del(tokenKey);

    // Get user
    const user = await fastify.redis.hGetAll(`user:id:${userId}`);
    if (!user.id) {
      return reply.code(401).send({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User not found", requestId: request.requestId },
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(fastify, user, deviceId);
    await storeRefreshToken(fastify, userId, deviceId, newRefreshToken, request.headers["user-agent"] || "", request.ip);

    // Set new cookies
    reply.setCookie("access_token", accessToken, { httpOnly: true, secure: config.env === "production", sameSite: "strict", maxAge: 15 * 60 * 1000, path: "/" });
    reply.setCookie("refresh_token", newRefreshToken, { httpOnly: true, secure: config.env === "production", sameSite: "strict", maxAge: 30 * 24 * 60 * 60 * 1000, path: "/" });

    return {
      success: true,
      data: { accessToken, refreshToken: newRefreshToken },
    };
  });

  // LOGOUT
  fastify.post("/logout", {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const deviceId = request.deviceId!;
    const userId = request.user!.sub;

    // Remove refresh token
    const keys = await fastify.redis.keys(`refresh:${userId}:${deviceId}:*`);
    if (keys.length > 0) {
      await fastify.redis.del(...keys);
    }

    // Blacklist access token
    await fastify.tokenBlacklist.add(request.user!.jti, 15 * 60 * 1000);

    // Clear cookies
    reply.clearCookie("access_token", { path: "/" });
    reply.clearCookie("refresh_token", { path: "/" });

    await fastify.auditLogger.log({ eventType: "auth.logout", severity: "low", userId, ip: request.ip });

    return { success: true, message: "Logged out successfully" };
  });

  // GET ME
  fastify.get("/me", {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = await fastify.redis.hGetAll(`user:id:${request.user!.sub}`);
    if (!user.id) {
      return reply.code(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "User not found", requestId: request.requestId },
      });
    }

    // Get stats
    const stats = {
      booksRead: await fastify.redis.sCard(`user:${user.id}:books:finished`),
      mangaRead: await fastify.redis.sCard(`user:${user.id}:manga:finished`),
      totalPagesRead: 0, // Would aggregate from reading list
      totalChaptersRead: 0,
      followersCount: await fastify.redis.sCard(`user:${user.id}:followers`),
      followingCount: await fastify.redis.sCard(`user:${user.id}:following`),
      readingListsCount: await fastify.redis.sCard(`user:${user.id}:reading_list`),
    };

    return {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl || null,
        bio: user.bio || null,
        readingPrivacy: user.readingPrivacy,
        readingLanguage: JSON.parse(user.readingLanguage || "[]"),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        stats,
      },
    };
  });

  // UPDATE PROFILE
  fastify.patch("/me", {
    preHandler: [fastify.authenticate],
    schema: { body: updateProfileSchema.shape.body },
  }, async (request, reply) => {
    const userId = request.user!.sub;
    const updates: Record<string, string> = {};

    const { displayName, bio, avatarUrl, readingPrivacy, readingLanguage } = request.body;
    if (displayName) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl) updates.avatarUrl = avatarUrl;
    if (readingPrivacy) updates.readingPrivacy = readingPrivacy;
    if (readingLanguage) updates.readingLanguage = JSON.stringify(readingLanguage);
    updates.updatedAt = new Date().toISOString();

    await fastify.redis.hSet(`user:id:${userId}`, updates);

    const updatedUser = await fastify.redis.hGetAll(`user:id:${userId}`);

    return {
      success: true,
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        avatarUrl: updatedUser.avatarUrl || null,
        bio: updatedUser.bio || null,
        readingPrivacy: updatedUser.readingPrivacy,
        readingLanguage: JSON.parse(updatedUser.readingLanguage || "[]"),
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    };
  });

  // CHANGE PASSWORD
  fastify.post("/change-password", {
    preHandler: [fastify.authenticate],
    schema: { body: changePasswordSchema.shape.body },
  }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body;
    const userId = request.user!.sub;

    const user = await fastify.redis.hGetAll(`user:id:${userId}`);
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    
    if (!valid) {
      return reply.code(401).send({
        success: false,
        error: { code: "INVALID_PASSWORD", message: "Current password is incorrect", requestId: request.requestId },
      });
    }

    const newHash = await bcrypt.hash(newPassword, securityConfig.password.cost);
    await fastify.redis.hSet(`user:id:${userId}`, { passwordHash: newHash, updatedAt: new Date().toISOString() });

    // Invalidate all other sessions (force re-login everywhere)
    const keys = await fastify.redis.keys(`refresh:${userId}:*`);
    if (keys.length > 0) {
      await fastify.redis.del(...keys);
    }
    await fastify.tokenBlacklist.add(request.user!.jti, 15 * 60 * 1000);

    reply.clearCookie("access_token", { path: "/" });
    reply.clearCookie("refresh_token", { path: "/" });

    await fastify.auditLogger.log({ eventType: "auth.password_changed", severity: "medium", userId, ip: request.ip });

    return { success: true, message: "Password changed. Please log in again." };
  });
};
