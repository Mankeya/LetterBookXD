export const config = {
  app: {
    name: 'LetterBookXD',
    url: process.env.APP_URL || 'http://localhost:3000',
    apiUrl: process.env.API_URL || 'http://localhost:8080',
  },
  database: {
    url: process.env.DATABASE_URL || 'mysql://letterbookxd:password@localhost:3306/letterbookxd',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: '7d',
    refreshExpiresIn: '30d',
  },
  tmdb: {
    apiKey: process.env.TMDB_API_KEY || '',
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
  },
  upload: {
    maxFileSize: 5 * 1024 * 1024,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
  },
} as const

export type Config = typeof config