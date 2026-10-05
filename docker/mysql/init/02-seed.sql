-- LetterBookXD Seed Data
-- Run after 01-schema.sql
USE letterbookxd;

-- Insert demo users (password: "password123" hashed with bcrypt cost 12)
INSERT IGNORE INTO users (id, username, email, password_hash, display_name, reading_privacy, reading_language, email_verified, created_at) VALUES
("550e8400-e29b-41d4-a716-446655440000", "demo_user", "demo@letterbookxd.com", "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S", "Demo User", "public", '["pt-BR", "en"]', TRUE, NOW()),
("550e8400-e29b-41d4-a716-446655440001", "bookworm_maria", "maria@letterbookxd.com", "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S", "Maria Silva", "public", '["pt-BR", "en"]', TRUE, NOW()),
("550e8400-e29b-41d4-a716-446655440002", "manga_kenji", "kenji@letterbookxd.com", "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S", "Kenji Tanaka", "followers", '["pt-BR", "en", "ja"]', TRUE, NOW());

-- Insert sample works (books from Open Library)
INSERT IGNORE INTO works (id, source, external_id, title, cover_url, description, authors, genres, published_year, rating_average, rating_count, isbn13, isbn10, page_count, publisher, language, subjects, preview_url) VALUES
("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1", "openlibrary", "OL27613W", "1984", "https://covers.openlibrary.org/b/id/8231851-L.jpg", "A dystopian social science fiction novel and cautionary tale about totalitarianism.", '[{"id": "OL34184A", "name": "George Orwell"}]', '["Dystopian", "Political Fiction", "Classic"]', 1949, 4.5, 125000, "9780451524935", "0451524934", 328, "Signet Classics", "en", '["Totalitarianism", "Surveillance", "Dystopia"]', "https://books.google.com/books?id=Z4r7DwAAQBAJ"),
("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee2", "openlibrary", "OL27448W", "To Kill a Mockingbird", "https://covers.openlibrary.org/b/id/8226191-L.jpg", "A novel about racial injustice and childhood innocence in the American South.", '[{"id": "OL34180A", "name": "Harper Lee"}]', '["Classic", "Legal Drama", "Coming of Age"]', 1960, 4.7, 98000, "9780061120084", "0061120081", 336, "J.B. Lippincott & Co.", "en", '["Racial Injustice", "Alabama", "Lawyers"]', "https://books.google.com/books?id=PGR2AwAAQBAJ"),
("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee3", "openlibrary", "OL26378W", "Pride and Prejudice", "https://covers.openlibrary.org/b/id/8226191-L.jpg", "A romantic novel of manners set in Georgian England.", '[{"id": "OL34181A", "name": "Jane Austen"}]', '["Romance", "Classic", "Historical Fiction"]', 1813, 4.6, 87000, "9780141439518", "0141439513", 432, "T. Egerton", "en", '["Marriage", "Social Class", "England"]', "https://books.google.com/books?id=1d0pDwAAQBAJ"),
("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee4", "openlibrary", "OL26379W", "The Great Gatsby", "https://covers.openlibrary.org/b/id/8226191-L.jpg", "A critique of the American Dream set in the Roaring Twenties.", '[{"id": "OL34182A", "name": "F. Scott Fitzgerald"}]', '["Classic", "Tragedy", "Jazz Age"]', 1925, 4.3, 76000, "9780743273565", "0743273567", 180, "Charles Scribner'\''s Sons", "en", '["American Dream", "Wealth", "New York"]', "https://books.google.com/books?id=4Y8fDwAAQBAJ"),
("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee5", "openlibrary", "OL26380W", "One Hundred Years of Solitude", "https://covers.openlibrary.org/b/id/8226191-L.jpg", "A multi-generational saga of the Buendía family in Macondo.", '[{"id": "OL34183A", "name": "Gabriel García Márquez"}]', '["Magical Realism", "Classic", "Family Saga"]', 1967, 4.4, 65000, "9780061120091", "006112009X", 417, "Harper & Row", "es", '["Colombia", "Family", "Magical Realism"]', "https://books.google.com/books?id=5Z8fDwAAQBAJ");

-- Insert sample works (manga from MangaDex)
INSERT IGNORE INTO works (id, source, external_id, title, cover_url, description, authors, genres, published_year, rating_average, rating_count, original_language, demographic, manga_status, chapter_count, year) VALUES
("bbbbbbbb-cccc-dddd-eeee-fffffffffff1", "mangadex", "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "One Piece", "https://uploads.mangadex.org/covers/a1b2c3d4-e5f6-7890-abcd-ef1234567890/cover.jpg", "Monkey D. Luffy and his pirate crew search for the ultimate treasure.", '[{"id": "author1", "name": "Eiichiro Oda"}]', '["Action", "Adventure", "Fantasy", "Shonen"]', 1997, 4.8, 45000, "ja", "shonen", "ongoing", 1100, 1997),
("bbbbbbbb-cccc-dddd-eeee-fffffffffff2", "mangadex", "b2c3d4e5-f6a7-8901-bcde-f23456789012", "Attack on Titan", "https://uploads.mangadex.org/covers/b2c3d4e5-f6a7-8901-bcde-f23456789012/cover.jpg", "Humanity fights for survival against giant humanoid Titans.", '[{"id": "author2", "name": "Hajime Isayama"}]', '["Action", "Dark Fantasy", "Post-Apocalyptic", "Shonen"]', 2009, 4.7, 38000, "ja", "shonen", "completed", 139, 2009),
("bbbbbbbb-cccc-dddd-eeee-fffffffffff3", "mangadex", "c3d4e5f6-a7b8-9012-cdef-345678901234", "Berserk", "https://uploads.mangadex.org/covers/c3d4e5f6-a7b8-9012-cdef-345678901234/cover.jpg", "A lone mercenary battles demons in a dark medieval world.", '[{"id": "author3", "name": "Kentaro Miura"}]', '["Dark Fantasy", "Action", "Horror", "Seinen"]', 1989, 4.9, 32000, "ja", "seinen", "hiatus", 370, 1989),
("bbbbbbbb-cccc-dddd-eeee-fffffffffff4", "mangadex", "d4e5f6a7-b8c9-0123-defg-456789012345", "Fullmetal Alchemist", "https://uploads.mangadex.org/covers/d4e5f6a7-b8c9-0123-defg-456789012345/cover.jpg", "Two brothers search for the Philosopher Stone to restore their bodies.", '[{"id": "author4", "name": "Hiromu Arakawa"}]', '["Action", "Adventure", "Fantasy", "Shonen"]', 2001, 4.9, 41000, "ja", "shonen", "completed", 108, 2001),
("bbbbbbbb-cccc-dddd-eeee-fffffffffff5", "mangadex", "e5f6a7b8-c9d0-1234-efgh-567890123456", "Vinland Saga", "https://uploads.mangadex.org/covers/e5f6a7b8-c9d0-1234-efgh-567890123456/cover.jpg", "A young Viking warrior seeks redemption in 11th century Europe.", '[{"id": "author5", "name": "Makoto Yukimura"}]', '["Action", "Historical", "Adventure", "Seinen"]', 2005, 4.8, 28000, "ja", "seinen", "ongoing", 200, 2005);

-- Insert sample manga chapters for One Piece
INSERT IGNORE INTO manga_chapters (id, manga_id, external_id, volume, chapter, title, language, pages, published_at) VALUES
("cccccccc-dddd-eeee-ffff-ggggggggggg1", "bbbbbbbb-cccc-dddd-eeee-fffffffffff1", "ch1", "1", "1", "Romance Dawn", "pt-BR", 19, "1997-07-22"),
("cccccccc-dddd-eeee-ffff-ggggggggggg2", "bbbbbbbb-cccc-dddd-eeee-fffffffffff1", "ch2", "1", "2", "The Man Who Will Be King", "pt-BR", 19, "1997-07-29"),
("cccccccc-dddd-eeee-ffff-ggggggggggg3", "bbbbbbbb-cccc-dddd-eeee-fffffffffff1", "ch3", "1", "3", "Morgan vs Luffy", "pt-BR", 19, "1997-08-05");

-- Insert sample manga chapters for Attack on Titan
INSERT IGNORE INTO manga_chapters (id, manga_id, external_id, volume, chapter, title, language, pages, published_at) VALUES
("dddddddd-eeee-ffff-gggg-hhhhhhhhhhh1", "bbbbbbbb-cccc-dddd-eeee-fffffffffff2", "ch1", "1", "1", "To You, 2000 Years From Now", "pt-BR", 45, "2009-09-09"),
("dddddddd-eeee-ffff-gggg-hhhhhhhhhhh2", "bbbbbbbb-cccc-dddd-eeee-fffffffffff2", "ch2", "1", "2", "That Day", "pt-BR", 45, "2009-10-09");

-- Insert sample reading lists for demo_user
INSERT IGNORE INTO reading_lists (id, user_id, work_id, work_type, status, rating, progress, total_progress, started_at, finished_at, is_public) VALUES
("eeeeeeee-ffff-gggg-hhhh-iiiiiiiiiii1", "550e8400-e29b-41d4-a716-446655440000", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1", "book", "finished", 4.5, 328, 328, "2024-01-15", "2024-02-10", TRUE),
("eeeeeeee-ffff-gggg-hhhh-iiiiiiiiiii2", "550e8400-e29b-41d4-a716-446655440000", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee2", "book", "reading", NULL, 150, 336, "2024-03-01", NULL, TRUE),
("eeeeeeee-ffff-gggg-hhhh-iiiiiiiiiii3", "550e8400-e29b-41d4-a716-446655440000", "bbbbbbbb-cccc-dddd-eeee-fffffffffff1", "manga", "reading", NULL, 50, 1100, "2024-02-15", NULL, TRUE),
("eeeeeeee-ffff-gggg-hhhh-iiiiiiiiiii4", "550e8400-e29b-41d4-a716-446655440000", "bbbbbbbb-cccc-dddd-eeee-fffffffffff2", "manga", "finished", 5.0, 139, 139, "2024-01-10", "2024-01-25", TRUE),
("eeeeeeee-ffff-gggg-hhhh-iiiiiiiiiii5", "550e8400-e29b-41d4-a716-446655440000", "bbbbbbbb-cccc-dddd-eeee-fffffffffff3", "manga", "want_to_read", NULL, 0, 370, NULL, NULL, TRUE);

-- Insert sample reading lists for bookworm_maria
INSERT IGNORE INTO reading_lists (id, user_id, work_id, work_type, status, rating, progress, total_progress, started_at, finished_at, is_public) VALUES
("ffffffff-gggg-hhhh-iiii-jjjjjjjjjjj1", "550e8400-e29b-41d4-a716-446655440001", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee3", "book", "finished", 5.0, 432, 432, "2024-01-01", "2024-01-20", TRUE),
("ffffffff-gggg-hhhh-iiii-jjjjjjjjjjj2", "550e8400-e29b-41d4-a716-446655440001", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee4", "book", "finished", 4.0, 180, 180, "2024-01-21", "2024-01-28", TRUE),
("ffffffff-gggg-hhhh-iiii-jjjjjjjjjjj3", "550e8400-e29b-41d4-a716-446655440001", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee5", "book", "reading", NULL, 200, 417, "2024-02-01", NULL, TRUE);

-- Insert sample follows
INSERT IGNORE INTO follows (follower_id, following_id) VALUES
("550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"),
("550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440002"),
("550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440000");

-- Insert sample activities
INSERT IGNORE INTO activities (id, user_id, type, work_id, work_type, metadata) VALUES
("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee6", "550e8400-e29b-41d4-a716-446655440000", "finished_reading", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1", "book", '{"rating": 4.5}'),
("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee7", "550e8400-e29b-41d4-a716-446655440000", "started_reading", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee2", "book", "{}"),
("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee8", "550e8400-e29b-41d4-a716-446655440000", "started_reading", "bbbbbbbb-cccc-dddd-eeee-fffffffffff1", "manga", "{}"),
("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee9", "550e8400-e29b-41d4-a716-446655440000", "finished_reading", "bbbbbbbb-cccc-dddd-eeee-fffffffffff2", "manga", '{"rating": 5.0}'),
("bbbbbbbb-cccc-dddd-eeee-fffffffffff6", "550e8400-e29b-41d4-a716-446655440001", "finished_reading", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee3", "book", '{"rating": 5.0}'),
("bbbbbbbb-cccc-dddd-eeee-fffffffffff7", "550e8400-e29b-41d4-a716-446655440001", "finished_reading", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee4", "book", '{"rating": 4.0}');
