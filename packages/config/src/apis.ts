export const externalApis = {
  openlibrary: {
    baseUrl: "https://openlibrary.org",
    // Search endpoint
    search: "/search.json",
    // Work details
    work: "/works/{id}.json",
    // Editions of a work
    editions: "/works/{id}/editions.json",
    // Author details
    author: "/authors/{id}.json",
    // Subject/genre
    subject: "/subjects/{subject}.json",
    // Cover images
    cover: {
      baseUrl: "https://covers.openlibrary.org",
      paths: {
        large: "/b/id/{id}-L.jpg",
        medium: "/b/id/{id}-M.jpg",
        small: "/b/id/{id}-S.jpg",
      },
      fallback: "/b/id/8226191-L.jpg", // Generic book cover
    },
    // Rate limiting (conservative)
    rateLimit: {
      max: 100,
      windowMs: 60000,
    },
    // Timeouts
    timeout: {
      connect: 5000,
      request: 15000,
    },
    // Retry config
    retry: {
      attempts: 3,
      delay: 1000,
      backoff: 2,
    },
    // Circuit breaker
    circuitBreaker: {
      threshold: 5,
      timeout: 30000,
    },
  },

  mangadex: {
    baseUrl: "https://api.mangadex.org",
    // Search manga
    search: "/manga",
    // Manga details
    manga: "/manga/{id}",
    // Manga cover
    cover: "/cover/{id}",
    // Chapters list
    chapters: "/manga/{id}/chapters",
    // Chapter details
    chapter: "/chapter/{id}",
    // Chapter pages (at-home server)
    atHome: "/at-home/server/{chapterId}",
    // Author
    author: "/author/{id}",
    // Tags
    tags: "/manga/tag",
    // Custom list
    customList: "/custom-list/{id}",
    // Report
    report: "/report",
    // Image base URLs
    imageBase: {
      main: "https://uploads.mangadex.org/data",
      dataSaver: "https://uploads.mangadex.org/data-saver",
    },
    // Supported languages (ISO 639-1)
    languages: [
      "en", "pt-br", "es", "fr", "de", "it", "ru", "zh", "ja", "ko",
      "ar", "hi", "bn", "pt", "tr", "vi", "th", "id", "ms", "tl",
    ],
    // Content ratings
    contentRatings: ["safe", "suggestive", "erotica", "pornographic"] as const,
    // Publication demographics
    demographics: ["shonen", "seinen", "shojo", "josei", "kodomomuke"] as const,
    // Manga statuses
    statuses: ["ongoing", "completed", "hiatus", "cancelled"] as const,
    // Order options
    order: {
      fields: [
        "title",
        "rating",
        "followedCount",
        "relevance",
        "createdAt",
        "updatedAt",
        "year",
      ] as const,
      directions: ["asc", "desc"] as const,
    },
    // Includes for expansion
    includes: [
      "cover_art",
      "author",
      "artist",
      "tags",
      "scanlation_group",
      "user",
      "custom_list",
    ] as const,
    // Rate limiting (official limit: 60 req/min)
    rateLimit: {
      max: 60,
      windowMs: 60000,
    },
    // Timeouts
    timeout: {
      connect: 5000,
      request: 20000,
      atHome: 10000,
    },
    // Retry config
    retry: {
      attempts: 3,
      delay: 1000,
      backoff: 2,
    },
    // Circuit breaker
    circuitBreaker: {
      threshold: 5,
      timeout: 30000,
    },
  },
} as const;

export type ExternalApis = typeof externalApis;

// ============================================
// ENVIRONMENT VALIDATION
// ============================================
export const requiredEnvVars = [
  "JWT_SECRET",
  "DATABASE_URL",
  "REDIS_URL",
] as const;

export const optionalEnvVars = [
  "NODE_ENV",
  "APP_URL",
  "API_URL",
  "CORS_ORIGIN",
  "BCRYPT_COST",
  "LOG_LEVEL",
  "LOKI_URL",
  "DPO_EMAIL",
  "DATA_RETENTION_DAYS",
] as const;

export function validateEnv(): { valid: boolean; missing: string[] } {
  const missing = requiredEnvVars.filter(
    (key) => !process.env[key] || process.env[key]!.trim() === ""
  );
  return {
    valid: missing.length === 0,
    missing,
  };
}

// ============================================
// CONFIG FACTORY
// ============================================
export function createConfig() {
  const validation = validateEnv();
  if (!validation.valid) {
    throw new Error(
      `Missing required environment variables: ${validation.missing.join(", ")}`
    );
  }

  return {
    env: process.env.NODE_ENV || "development",
    app: {
      url: process.env.APP_URL || "http://localhost:3000",
      apiUrl: process.env.API_URL || "http://localhost:8080",
    },
    database: {
      url: process.env.DATABASE_URL!,
      ssl: process.env.NODE_ENV === "production",
    },
    redis: {
      url: process.env.REDIS_URL!,
      tls: process.env.NODE_ENV === "production",
    },
    jwt: {
      secret: process.env.JWT_SECRET!,
      accessTtl: "15m",
      refreshTtl: "30d",
    },
    bcrypt: {
      cost: parseInt(process.env.BCRYPT_COST || "12", 10),
    },
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") || [
        "https://letterbookxd.com",
        "https://app.letterbookxd.com",
        "http://localhost:3000",
      ],
    },
    logging: {
      level: process.env.LOG_LEVEL || "info",
      lokiUrl: process.env.LOKI_URL || "http://loki:3100",
    },
    lgpd: {
      dpoEmail: process.env.DPO_EMAIL || "dpo@letterbookxd.com",
      dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || "365", 10),
    },
    externalApis,
  };
}
