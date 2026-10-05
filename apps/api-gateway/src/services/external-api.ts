import { FastifyInstance } from "fastify";
import { config } from "@letterbookxd/config";
import { externalApis } from "@letterbookxd/config";
import { securityConfig } from "@letterbookxd/config";

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: "closed" | "open" | "half-open";
}

interface RateLimitState {
  count: number;
  resetTime: number;
}

export class ExternalApiClient {
  private fastify: FastifyInstance;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private rateLimits: Map<string, RateLimitState> = new Map();
  private fetchFn: typeof fetch;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.fetchFn = fetch;
    this.initializeCircuitBreakers();
  }

  private initializeCircuitBreakers(): void {
    for (const [name, api] of Object.entries(externalApis)) {
      this.circuitBreakers.set(name, {
        failures: 0,
        lastFailure: 0,
        state: "closed",
      });
      this.rateLimits.set(name, {
        count: 0,
        resetTime: Date.now() + api.rateLimit.windowMs,
      });
    }
  }

  // ============================================
  // OPEN LIBRARY
  // ============================================
  async searchBooks(params: {
    q: string;
    page?: number;
    limit?: number;
    lang?: string[];
    subject?: string;
    author?: string;
  }) {
    return this.request("openlibrary", async () => {
      const searchParams = new URLSearchParams();
      searchParams.set("q", params.q);
      searchParams.set("page", String(params.page || 1));
      searchParams.set("limit", String(Math.min(params.limit || 20, 100)));
      searchParams.set("fields", "key,title,author_name,first_sentence,cover_i,first_publish_year,subject,language,isbn,edition_count,rating_average");
      
      if (params.lang?.length) searchParams.set("language", params.lang.join(","));
      if (params.subject) searchParams.set("subject", params.subject);
      if (params.author) searchParams.set("author", params.author);

      const url = `${externalApis.openlibrary.baseUrl}${externalApis.openlibrary.search}?${searchParams}`;
      return this.fetchWithTimeout(url, externalApis.openlibrary.timeout.request);
    });
  }

  async getBookById(olid: string) {
    return this.request("openlibrary", async () => {
      const url = `${externalApis.openlibrary.baseUrl}${externalApis.openlibrary.work.replace("{id}", olid)}`;
      return this.fetchWithTimeout(url, externalApis.openlibrary.timeout.request);
    });
  }

  async getBookEditions(olid: string) {
    return this.request("openlibrary", async () => {
      const url = `${externalApis.openlibrary.baseUrl}${externalApis.openlibrary.editions.replace("{id}", olid)}`;
      return this.fetchWithTimeout(url, externalApis.openlibrary.timeout.request);
    });
  }

  async getAuthorById(olid: string) {
    return this.request("openlibrary", async () => {
      const url = `${externalApis.openlibrary.baseUrl}${externalApis.openlibrary.author.replace("{id}", olid)}`;
      return this.fetchWithTimeout(url, externalApis.openlibrary.timeout.request);
    });
  }

  getCoverUrl(coverId: number, size: "S" | "M" | "L" = "L"): string {
    const sizes = { S: "S", M: "M", L: "L" };
    return `${externalApis.openlibrary.cover.baseUrl}/b/id/${coverId}-${sizes[size]}.jpg`;
  }

  // ============================================
  // MANGADEX
  // ============================================
  async searchManga(params: {
    title?: string;
    page?: number;
    limit?: number;
    lang?: string[];
    demographic?: string[];
    status?: string[];
    tags?: string[];
    order?: Record<string, "asc" | "desc">;
  }) {
    return this.request("mangadex", async () => {
      const searchParams = new URLSearchParams();
      
      if (params.title) searchParams.set("title", params.title);
      searchParams.set("limit", String(Math.min(params.limit || 20, 100)));
      searchParams.set("offset", String((params.page || 1 - 1) * (params.limit || 20)));
      
      if (params.lang?.length) {
        params.lang.forEach(l => searchParams.append("translatedLanguage[]", l));
      } else {
        searchParams.append("translatedLanguage[]", "pt-br");
        searchParams.append("translatedLanguage[]", "en");
      }

      if (params.demographic?.length) {
        params.demographic.forEach(d => searchParams.append("publicationDemographic[]", d));
      }
      if (params.status?.length) {
        params.status.forEach(s => searchParams.append("status[]", s));
      }
      if (params.tags?.length) {
        params.tags.forEach(t => searchParams.append("includedTags[]", t));
      }
      if (params.order) {
        Object.entries(params.order).forEach(([field, direction]) => {
          searchParams.set(`order[${field}]`, direction);
        });
      }

      // Includes
      searchParams.append("includes[]", "cover_art");
      searchParams.append("includes[]", "author");
      searchParams.append("includes[]", "tags");

      const url = `${externalApis.mangadex.baseUrl}${externalApis.mangadex.search}?${searchParams}`;
      return this.fetchWithTimeout(url, externalApis.mangadex.timeout.request);
    });
  }

  async getMangaById(id: string) {
    return this.request("mangadex", async () => {
      const searchParams = new URLSearchParams();
      searchParams.append("includes[]", "cover_art");
      searchParams.append("includes[]", "author");
      searchParams.append("includes[]", "tags");

      const url = `${externalApis.mangadex.baseUrl}${externalApis.mangadex.manga.replace("{id}", id)}?${searchParams}`;
      return this.fetchWithTimeout(url, externalApis.mangadex.timeout.request);
    });
  }

  async getMangaChapters(mangaId: string, params: {
    lang?: string[];
    page?: number;
    limit?: number;
    order?: "asc" | "desc";
  } = {}) {
    return this.request("mangadex", async () => {
      const searchParams = new URLSearchParams();
      searchParams.set("limit", String(Math.min(params.limit || 100, 500)));
      searchParams.set("offset", String((params.page || 1 - 1) * (params.limit || 100)));
      
      if (params.lang?.length) {
        params.lang.forEach(l => searchParams.append("translatedLanguage[]", l));
      } else {
        searchParams.append("translatedLanguage[]", "pt-br");
        searchParams.append("translatedLanguage[]", "en");
      }
      
      searchParams.set("order[chapter]", params.order || "asc");
      searchParams.append("includes[]", "scanlation_group");

      const url = `${externalApis.mangadex.baseUrl}${externalApis.mangadex.chapters.replace("{id}", mangaId)}?${searchParams}`;
      return this.fetchWithTimeout(url, externalApis.mangadex.timeout.request);
    });
  }

  async getChapterById(chapterId: string) {
    return this.request("mangadex", async () => {
      const searchParams = new URLSearchParams();
      searchParams.append("includes[]", "scanlation_group");
      searchParams.append("includes[]", "manga");

      const url = `${externalApis.mangadex.baseUrl}${externalApis.mangadex.chapter.replace("{id}", chapterId)}?${searchParams}`;
      return this.fetchWithTimeout(url, externalApis.mangadex.timeout.request);
    });
  }

  async getChapterImages(chapterId: string) {
    return this.request("mangadex", async () => {
      const url = `${externalApis.mangadex.baseUrl}${externalApis.mangadex.atHome.replace("{chapterId}", chapterId)}`;
      return this.fetchWithTimeout(url, externalApis.mangadex.timeout.atHome);
    });
  }

  getMangaImageUrl(baseUrl: string, hash: string, filename: string, dataSaver: boolean = false): string {
    const path = dataSaver ? "data-saver" : "data";
    return `${baseUrl}/${path}/${hash}/${filename}`;
  }

  // ============================================
  // CORE REQUEST METHOD
  // ============================================
  private async request<T>(apiName: string, fn: () => Promise<T>): Promise<T> {
    const breaker = this.circuitBreakers.get(apiName)!;
    const apiConfig = externalApis[apiName as keyof typeof externalApis];
    
    // Check circuit breaker
    if (breaker.state === "open") {
      if (Date.now() - breaker.lastFailure > apiConfig.circuitBreaker.timeout) {
        breaker.state = "half-open";
      } else {
        throw new Error(`Circuit breaker open for ${apiName}`);
      }
    }

    // Check rate limit
    await this.checkRateLimit(apiName);

    try {
      const result = await fn();
      
      // Success - reset circuit breaker
      if (breaker.state === "half-open") {
        breaker.state = "closed";
        breaker.failures = 0;
      }
      
      return result;
    } catch (error) {
      // Failure - increment circuit breaker
      breaker.failures++;
      breaker.lastFailure = Date.now();
      
      if (breaker.failures >= apiConfig.circuitBreaker.threshold) {
        breaker.state = "open";
        this.fastify.log.warn({ event: "circuit_breaker.opened", api: apiName }, "Circuit breaker opened");
      }
      
      throw error;
    }
  }

  private async checkRateLimit(apiName: string): Promise<void> {
    const rateLimit = this.rateLimits.get(apiName)!;
    const apiConfig = externalApis[apiName as keyof typeof externalApis];
    const now = Date.now();

    if (now > rateLimit.resetTime) {
      rateLimit.count = 0;
      rateLimit.resetTime = now + apiConfig.rateLimit.windowMs;
    }

    if (rateLimit.count >= apiConfig.rateLimit.max) {
      const waitTime = rateLimit.resetTime - now;
      throw new Error(`Rate limit exceeded for ${apiName}, retry in ${waitTime}ms`);
    }

    rateLimit.count++;
  }

  private async fetchWithTimeout(url: string, timeoutMs: number): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await this.fetchFn(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "LetterBookXD/1.0 (+https://letterbookxd.com)",
          "Accept": "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if ((error as any).name === "AbortError") {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      throw error;
    }
  }
}
