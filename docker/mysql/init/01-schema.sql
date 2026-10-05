-- LetterBookXD Database Schema
-- MySQL 8.0+ with utf8mb4

CREATE DATABASE IF NOT EXISTS letterbookxd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE letterbookxd;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    email_encrypted VARBINARY(512),
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    bio TEXT,
    reading_privacy ENUM("public", "followers", "private") NOT NULL DEFAULT "public",
    reading_language JSON NOT NULL DEFAULT ("[\"pt-BR\", \"en\"]"),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    last_login_ip VARCHAR(45),
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP NULL,
    lgpd_consent JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DEVICE FINGERPRINTS (for refresh token binding)
-- ============================================
CREATE TABLE device_fingerprints (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    fingerprint_hash VARCHAR(64) NOT NULL,
    user_agent TEXT NOT NULL,
    ip_hash VARCHAR(64) NOT NULL,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_fingerprint (user_id, fingerprint_hash),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- REFRESH TOKENS (rotating, single-use, hashed)
-- ============================================
CREATE TABLE refresh_tokens (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    device_id CHAR(36) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    jti VARCHAR(36) NOT NULL,
    user_agent TEXT NOT NULL,
    ip VARCHAR(45) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES device_fingerprints(id) ON DELETE CASCADE,
    UNIQUE KEY unique_jti (jti),
    INDEX idx_user_device (user_id, device_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- WORKS (unified books + manga)
-- ============================================
CREATE TABLE works (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    source ENUM("openlibrary", "mangadex") NOT NULL,
    external_id VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    cover_url VARCHAR(500),
    description TEXT,
    authors JSON NOT NULL,
    genres JSON NOT NULL,
    published_year INT,
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    rating_count INT DEFAULT 0,
    -- Book specific fields
    isbn13 VARCHAR(13),
    isbn10 VARCHAR(10),
    page_count INT,
    publisher VARCHAR(200),
    language VARCHAR(10),
    subjects JSON,
    preview_url VARCHAR(500),
    -- Manga specific fields
    original_language VARCHAR(10),
    demographic ENUM("shonen", "seinen", "shojo", "josei", "kodomomuke", "unknown"),
    manga_status ENUM("ongoing", "completed", "hiatus", "cancelled"),
    chapter_count INT DEFAULT 0,
    latest_chapter_id CHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_source_external (source, external_id),
    INDEX idx_title (title),
    INDEX idx_source_status (source, manga_status),
    INDEX idx_genres (genres),
    INDEX idx_published_year (published_year),
    INDEX idx_rating (rating_average),
    INDEX idx_source_type (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MANGA CHAPTERS
-- ============================================
CREATE TABLE manga_chapters (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    manga_id CHAR(36) NOT NULL,
    external_id VARCHAR(100) NOT NULL,
    volume VARCHAR(20),
    chapter VARCHAR(20) NOT NULL,
    title VARCHAR(200),
    language VARCHAR(10) NOT NULL DEFAULT "en",
    pages INT DEFAULT 0,
    published_at TIMESTAMP NULL,
    external_url VARCHAR(500),
    scanlation_group VARCHAR(200),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (manga_id) REFERENCES works(id) ON DELETE CASCADE,
    UNIQUE KEY unique_manga_external (manga_id, external_id),
    INDEX idx_manga_published (manga_id, published_at),
    INDEX idx_manga_chapter_num (manga_id, chapter)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- READING LISTS
-- ============================================
CREATE TABLE reading_lists (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    work_id CHAR(36) NOT NULL,
    work_type ENUM("book", "manga") NOT NULL,
    status ENUM("reading", "want_to_read", "finished", "dropped", "on_hold") NOT NULL DEFAULT "want_to_read",
    rating DECIMAL(2,1),
    progress INT NOT NULL DEFAULT 0,
    total_progress INT,
    started_at TIMESTAMP NULL,
    finished_at TIMESTAMP NULL,
    notes TEXT,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_work (user_id, work_id),
    INDEX idx_user_status (user_id, status),
    INDEX idx_work_status (work_id, status),
    INDEX idx_public_status (is_public, status),
    INDEX idx_user_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- FOLLOWS
-- ============================================
CREATE TABLE follows (
    follower_id CHAR(36) NOT NULL,
    following_id CHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_follower (follower_id),
    INDEX idx_following (following_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ACTIVITIES (Feed)
-- ============================================
CREATE TABLE activities (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    type ENUM("started_reading", "finished_reading", "added_to_list", "rated", "reviewed", "followed", "updated_progress") NOT NULL,
    work_id CHAR(36),
    work_type ENUM("book", "manga"),
    metadata JSON NOT NULL DEFAULT ("{}"),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE SET NULL,
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_work_created (work_id, created_at),
    INDEX idx_type_created (type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- REVIEWS (for future use)
-- ============================================
CREATE TABLE reviews (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    work_id CHAR(36) NOT NULL,
    work_type ENUM("book", "manga") NOT NULL,
    rating DECIMAL(2,1) NOT NULL,
    content TEXT NOT NULL,
    spoiler BOOLEAN NOT NULL DEFAULT FALSE,
    likes_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_work_review (user_id, work_id),
    INDEX idx_work_created (work_id, created_at),
    INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- REVIEW LIKES
-- ============================================
CREATE TABLE review_likes (
    review_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (review_id, user_id),
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- LGPD: DATA EXPORT REQUESTS
-- ============================================
CREATE TABLE data_export_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    status ENUM("pending", "processing", "completed", "failed") NOT NULL DEFAULT "pending",
    format ENUM("json", "csv") NOT NULL DEFAULT "json",
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    download_url VARCHAR(500),
    expires_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- LGPD: DELETION REQUESTS
-- ============================================
CREATE TABLE deletion_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    status ENUM("pending", "confirming", "processing", "completed", "rejected") NOT NULL DEFAULT "pending",
    reason TEXT,
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    ip VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- RATE LIMIT TRACKING (Redis-backed in prod, fallback here)
-- ============================================
CREATE TABLE rate_limit_logs (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    identifier VARCHAR(100) NOT NULL,
    endpoint VARCHAR(200) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    user_id CHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_identifier_time (identifier, created_at),
    INDEX idx_endpoint_time (endpoint, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- AUDIT LOG (Security events)
-- ============================================
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    event_type VARCHAR(100) NOT NULL,
    severity ENUM("low", "medium", "high", "critical") NOT NULL DEFAULT "low",
    user_id CHAR(36),
    ip VARCHAR(45),
    user_agent TEXT,
    metadata JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_event_type (event_type),
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_severity_created (severity, created_at),
    INDEX idx_ip_created (ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
