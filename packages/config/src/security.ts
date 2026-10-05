export const securityConfig = {
  // ============================================
  // RATE LIMITING (Multi-layer)
  // ============================================
  rateLimit: {
    // Nginx (Edge) - applied at ingress
    nginx: {
      requestsPerSecond: 100,
      burst: 500,
      connectionsPerIp: 10,
      zoneSize: "10m",
    },
    
    // API Gateway (Fastify) - global limits
    gateway: {
      global: { max: 200, windowMs: 60000 },           // 200 req/min per IP
      auth: { max: 10, windowMs: 60000 },              // 10 req/min for login/register
      search: { max: 30, windowMs: 60000 },            // 30 req/min for search
      mutations: { max: 60, windowMs: 60000 },         // 60 req/min for POST/PATCH/DELETE
      proxy: { max: 120, windowMs: 60000 },            // 120 req/min for manga proxy
      health: { max: 1000, windowMs: 60000 },          // 1000 req/min for health checks
    },
    
    // Per authenticated user
    user: {
      api: { max: 300, windowMs: 60000 },              // 300 req/min per user
      mutations: { max: 30, windowMs: 60000 },         // 30 mutations/min per user
      proxy: { max: 120, windowMs: 60000 },            // 120 proxy req/min per user
      feed: { max: 60, windowMs: 60000 },              // 60 feed req/min per user
    },
    
    // External APIs (outbound)
    external: {
      openlibrary: { max: 100, windowMs: 60000 },      // 100 req/min (conservative)
      mangadex: { max: 60, windowMs: 60000 },          // 60 req/min (official limit)
    },
    
    // Headers
    headers: {
      limit: "X-RateLimit-Limit",
      remaining: "X-RateLimit-Remaining",
      reset: "X-RateLimit-Reset",
      retryAfter: "Retry-After",
    },
  },

  // ============================================
  // JWT CONFIGURATION (HS256)
  // ============================================
  jwt: {
    algorithm: "HS256" as const,
    accessTokenTtl: "15m",
    refreshTokenTtl: "30d",
    keyRotationDays: 90,
    issuer: "letterbookxd",
    audience: "letterbookxd-app",
    // Key should be 256-bit (32 bytes) base64 encoded, stored in vault
    // Example: openssl rand -base64 32
    secretEnvVar: "JWT_SECRET",
    // Token blacklist for revocation (Redis set with TTL)
    blacklistPrefix: "jwt:blacklist:",
  },

  // ============================================
  // PASSWORD SECURITY (bcrypt cost 12)
  // ============================================
  password: {
    algorithm: "bcrypt",
    cost: 12,
    minLength: 12,
    maxLength: 128,
    // Optional: check against HaveIBeenPwned (k-anonymity)
    breachCheck: {
      enabled: true,
      apiUrl: "https://api.pwnedpasswords.com/range/",
    },
    // Prevent common patterns
    forbiddenPatterns: [
      /^password$/i,
      /^123456/,
      /^qwerty/i,
      /^admin$/i,
      /^letterbookxd$/i,
    ],
  },

  // ============================================
  // SESSION & COOKIE SECURITY
  // ============================================
  session: {
    cookie: {
      name: "lbxd_session",
      secure: true,
      httpOnly: true,
      sameSite: "strict" as const,
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days (refresh token)
    },
    csrf: {
      enabled: true,
      headerName: "x-csrf-token",
      cookieName: "csrf_token",
      cookieOptions: {
        secure: true,
        httpOnly: true,
        sameSite: "strict" as const,
        path: "/",
      },
    },
    deviceFingerprint: {
      enabled: true,
      // Components: userAgent + acceptLanguage + screenResolution + timezone
      hashAlgorithm: "sha256",
    },
    ipBinding: {
      enabled: true,
      cidrMask: 24, // /24 subnet (allows ISP IP rotation)
    },
    // Concurrent sessions limit
    maxConcurrentSessions: 5,
  },

  // ============================================
  // CORS (Restrictive)
  // ============================================
  cors: {
    allowedOrigins: [
      "https://letterbookxd.com",
      "https://app.letterbookxd.com",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "Accept-Language",
      "X-Request-ID",
    ],
    exposedHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "Retry-After",
    ],
    maxAge: 86400, // 24 hours
  },

  // ============================================
  // MANGA IMAGE PROXY (SSRF Protection)
  // ============================================
  mangaProxy: {
    allowedHosts: [
      "uploads.mangadex.org",
      "covers.openlibrary.org",
    ],
    allowedPaths: [
      "/data/",
      "/data-saver/",
      "/b/id/",
    ],
    cacheTtl: 86400, // 24 hours
    maxSize: 10 * 1024 * 1024, // 10MB
    timeout: 30000, // 30 seconds
    // Validate URL before proxying
    validateUrl: (url: string): boolean => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") return false;
        const allowed = securityConfig.mangaProxy.allowedHosts.some(h => 
          parsed.hostname === h || parsed.hostname.endsWith("." + h)
        );
        if (!allowed) return false;
        const pathAllowed = securityConfig.mangaProxy.allowedPaths.some(p => 
          parsed.pathname.startsWith(p)
        );
        return pathAllowed;
      } catch {
        return false;
      }
    },
  },

  // ============================================
  // CONTENT SECURITY POLICY
  // ============================================
  csp: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "https:", "blob:"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "connect-src": [
        "'self'",
        "https://api.mangadex.org",
        "https://covers.openlibrary.org",
        "https://openlibrary.org",
      ],
      "frame-ancestors": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "upgrade-insecure-requests": true,
      "block-all-mixed-content": true,
    },
    reportOnly: false,
    reportUri: "/api/csp-report",
  },

  // ============================================
  // HELMET SECURITY HEADERS
  // ============================================
  helmet: {
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: "same-origin" as const },
    crossOriginResourcePolicy: { policy: "same-origin" as const },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" as const },
    hidePoweredBy: true,
    hsts: { 
      maxAge: 31536000, 
      includeSubDomains: true, 
      preload: true 
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" as const },
    xssFilter: true,
  },

  // ============================================
  // INPUT VALIDATION & SANITIZATION
  // ============================================
  validation: {
    // Max request body size
    bodyLimit: "1mb",
    // Parameter pollution prevention
    queryParser: "extended" as const,
    // Strict JSON parsing
    strictJson: true,
  },

  // ============================================
  // LGPD COMPLIANCE
  // ============================================
  lgpd: {
    // Data retention
    dataRetentionDays: 365,
    // Anonymization after deletion
    anonymizeOnDelete: true,
    // DPO contact
    dpoEmail: "dpo@letterbookxd.com",
    // Consent categories
    consentCategories: [
      "essential",
      "analytics", 
      "marketing",
      "third_party",
    ] as const,
    // Default consent (minimal)
    defaultConsent: {
      essential: true,
      analytics: false,
      marketing: false,
      third_party: false,
    },
    // Data export
    exportFormats: ["json", "csv"] as const,
    exportMaxSize: 50 * 1024 * 1024, // 50MB
    // Deletion verification
    deletionVerificationRequired: true,
    deletionGracePeriodDays: 30,
  },

  // ============================================
  // SECURITY EVENTS (for audit logging)
  // ============================================
  securityEvents: {
    // Auth events
    AUTH_LOGIN_SUCCESS: "auth.login.success",
    AUTH_LOGIN_FAILURE: "auth.login.failure",
    AUTH_LOGOUT: "auth.logout",
    AUTH_REGISTER: "auth.register",
    AUTH_PASSWORD_RESET_REQUEST: "auth.password_reset.request",
    AUTH_PASSWORD_RESET_COMPLETE: "auth.password_reset.complete",
    AUTH_TOKEN_REFRESH: "auth.token.refresh",
    AUTH_TOKEN_REVOKED: "auth.token.revoked",
    AUTH_DEVICE_NEW: "auth.device.new",
    AUTH_DEVICE_REMOVED: "auth.device.removed",
    AUTH_SUSPICIOUS_ACTIVITY: "auth.suspicious",
    
    // Rate limit events
    RATE_LIMIT_EXCEEDED: "rate_limit.exceeded",
    RATE_LIMIT_IP_BLOCKED: "rate_limit.ip_blocked",
    
    // Injection attempts
    INJECTION_SQL: "injection.sql",
    INJECTION_NOSQL: "injection.nosql",
    INJECTION_COMMAND: "injection.command",
    
    // XSS attempts
    XSS_REFLECTED: "xss.reflected",
    XSS_STORED: "xss.stored",
    XSS_DOM: "xss.dom",
    
    // SSRF attempts
    SSRF_ATTEMPT: "ssrf.attempt",
    
    // Access control
    ACCESS_DENIED: "access.denied",
    PRIVILEGE_ESCALATION: "access.privilege_escalation",
    IDOR_ATTEMPT: "access.idor",
    
    // Data protection
    DATA_EXPORT_REQUESTED: "data.export.requested",
    DATA_EXPORT_COMPLETED: "data.export.completed",
    DATA_DELETION_REQUESTED: "data.deletion.requested",
    DATA_DELETION_COMPLETED: "data.deletion.completed",
    
    // API abuse
    API_ABUSE: "api.abuse",
    WEBHOOK_INVALID: "webhook.invalid",
  },

  // ============================================
  // ENCRYPTION (for PII)
  // ============================================
  encryption: {
    algorithm: "aes-256-gcm",
    keyRotationDays: 90,
    // Key derived from master key + purpose
    keyDerivation: "hkdf-sha256",
    // Fields to encrypt at rest
    encryptedFields: [
      "users.email_encrypted",
      "users.lgpd_consent",
    ],
  },
} as const;

export type SecurityConfig = typeof securityConfig;
