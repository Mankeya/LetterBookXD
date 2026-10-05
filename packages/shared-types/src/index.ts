export type WorkSource = "openlibrary" | "mangadex";
export type WorkType = "book" | "manga";
export type ReadingStatus = "reading" | "want_to_read" | "finished" | "dropped" | "on_hold";
export type ReadingPrivacy = "public" | "followers" | "private";
export type ActivityType = 
  | "started_reading" 
  | "finished_reading" 
  | "added_to_list" 
  | "rated" 
  | "reviewed" 
  | "followed" 
  | "updated_progress";

export interface BaseWork {
  id: string;
  source: WorkSource;
  externalId: string;
  title: string;
  coverUrl?: string;
  authors: Author[];
  description?: string;
  genres: string[];
  publishedYear?: number;
  rating: Rating;
  createdAt: string;
  updatedAt: string;
}

export interface Author {
  id: string;
  name: string;
  externalId?: string;
}

export interface Rating {
  average: number;
  count: number;
}

export interface Book extends BaseWork {
  source: "openlibrary";
  type: "book";
  isbn13?: string;
  isbn10?: string;
  pageCount?: number;
  publisher?: string;
  language: string;
  subjects: string[];
  previewUrl?: string;
  editions: BookEdition[];
}

export interface BookEdition {
  id: string;
  isbn13?: string;
  isbn10?: string;
  publishDate?: string;
  publisher?: string;
  pageCount?: number;
  language: string;
  coverUrl?: string;
}

export interface Manga extends BaseWork {
  source: "mangadex";
  type: "manga";
  originalLanguage: string;
  demographic: MangaDemographic;
  status: MangaStatus;
  year: number;
  tags: MangaTag[];
  chapterCount: number;
  latestChapter?: Chapter;
}

export type MangaDemographic = "shonen" | "seinen" | "shojo" | "josei" | "kodomomuke" | "unknown";
export type MangaStatus = "ongoing" | "completed" | "hiatus" | "cancelled";

export interface MangaTag {
  id: string;
  name: string;
  group: "genre" | "theme" | "demographic" | "format";
}

export interface Chapter {
  id: string;
  mangaId: string;
  volume?: string;
  chapter: string;
  title?: string;
  language: string;
  pages: number;
  publishedAt: string;
  externalUrl?: string;
  scanlationGroup?: string;
}

export interface ChapterImages {
  baseUrl: string;
  chapter: ChapterHash;
  pages: string[];
}

export interface ChapterHash {
  hash: string;
  data: string[];
  dataSaver: string[];
}

export interface WorkSearchResult {
  works: (Book | Manga)[];
  meta: PaginationMeta;
  facets?: SearchFacets;
}

export interface SearchFacets {
  genres: FacetCount[];
  languages: FacetCount[];
  authors: FacetCount[];
  demographics?: FacetCount[];
  statuses?: FacetCount[];
}

export interface FacetCount {
  value: string;
  count: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ReadingListItem {
  id: string;
  userId: string;
  workId: string;
  workType: WorkType;
  status: ReadingStatus;
  rating?: number;
  progress: number;
  totalProgress?: number;
  startedAt?: string;
  finishedAt?: string;
  notes?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  work?: Book | Manga;
}

export interface ReadingListStats {
  reading: number;
  wantToRead: number;
  finished: number;
  dropped: number;
  onHold: number;
  total: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  readingPrivacy: ReadingPrivacy;
  readingLanguage: string[];
  createdAt: string;
  updatedAt: string;
  stats?: UserStats;
}

export interface UserStats {
  booksRead: number;
  mangaRead: number;
  totalPagesRead: number;
  totalChaptersRead: number;
  followersCount: number;
  followingCount: number;
  readingListsCount: number;
}

export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: ActivityType;
  workId?: string;
  workType?: WorkType;
  metadata: Record<string, unknown>;
  createdAt: string;
  user?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
  work?: Pick<Book | Manga, "id" | "title" | "coverUrl">;
}

export interface FeedResponse {
  activities: UserActivity[];
  meta: PaginationMeta;
}

export interface SearchParams {
  q?: string;
  type?: "all" | "books" | "manga";
  page?: number;
  limit?: number;
  lang?: string[];
  genres?: string[];
  authors?: string[];
  demographic?: MangaDemographic;
  status?: MangaStatus;
  sort?: "relevance" | "rating" | "popularity" | "recent" | "title";
  order?: "asc" | "desc";
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
}

export interface RateLimitHeaders {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface DeviceFingerprint {
  id: string;
  userAgent: string;
  ipHash: string;
  createdAt: number;
  lastSeen: number;
}

export interface TokenPayload {
  sub: string;
  jti: string;
  deviceId: string;
  scopes: string[];
  iat: number;
  exp: number;
}

export interface RefreshTokenData {
  hashedToken: string;
  createdAt: number;
  lastUsed: number;
  userAgent: string;
  ip: string;
}

export interface LGPDConsent {
  userId: string;
  marketing: boolean;
  analytics: boolean;
  thirdParty: boolean;
  updatedAt: string;
  ip: string;
  userAgent: string;
}

export interface DataExportRequest {
  id: string;
  userId: string;
  status: "pending" | "processing" | "completed" | "failed";
  format: "json" | "csv";
  requestedAt: string;
  completedAt?: string;
  downloadUrl?: string;
  expiresAt?: string;
}

export interface DeletionRequest {
  id: string;
  userId: string;
  status: "pending" | "confirming" | "processing" | "completed" | "rejected";
  reason?: string;
  requestedAt: string;
  confirmedAt?: string;
  completedAt?: string;
  ip: string;
  userAgent: string;
}
