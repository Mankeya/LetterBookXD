export interface User {
  id: string
  username: string
  email: string
  displayName: string
  avatarUrl?: string
  bio?: string
  createdAt: string
  updatedAt: string
  stats?: UserStats
}

export interface UserStats {
  moviesWatched: number
  reviewsWritten: number
  followersCount: number
  followingCount: number
}

export interface Movie {
  id: string
  tmdbId: number
  title: string
  originalTitle: string
  overview: string
  releaseDate: string
  runtime: number
  posterPath?: string
  backdropPath?: string
  genres: Genre[]
  voteAverage: number
  voteCount: number
  popularity: number
  createdAt: string
  updatedAt: string
  userRating?: number
  userReview?: Review
}

export interface Genre {
  id: number
  name: string
}

export interface Review {
  id: string
  userId: string
  movieId: string
  rating: number
  content: string
  spoiler: boolean
  likesCount: number
  commentsCount: number
  createdAt: string
  updatedAt: string
  user?: User
  movie?: Movie
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
  displayName: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface ApiError {
  statusCode: number
  message: string | string[]
  error: string
}

export type MovieSortBy =
  | 'popularity.desc'
  | 'popularity.asc'
  | 'release_date.desc'
  | 'release_date.asc'
  | 'vote_average.desc'
  | 'vote_average.asc'
  | 'title.asc'
  | 'title.desc'

export interface MovieFilters {
  page?: number
  limit?: number
  sortBy?: MovieSortBy
  genreIds?: number[]
  year?: number
  query?: string
  withWatchProviders?: number[]
}

export interface ReviewFilters {
  page?: number
  limit?: number
  sortBy?: 'createdAt.desc' | 'createdAt.asc' | 'likesCount.desc' | 'rating.desc'
  userId?: string
  movieId?: string
  minRating?: number
  maxRating?: number
}

export interface WatchlistItem {
  id: string
  userId: string
  movieId: string
  status: 'watched' | 'watchlist' | 'watching'
  rating?: number
  createdAt: string
  updatedAt: string
  movie?: Movie
}