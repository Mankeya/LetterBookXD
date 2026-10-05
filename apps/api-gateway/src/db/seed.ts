import { createClient } from "redis";
import { config } from "@letterbookxd/config";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

async function seed() {
  console.log("?? Starting database seeding...");

  const redis = createClient({ url: config.redis.url });
  await redis.connect();

  const passwordHash = await bcrypt.hash("password123", config.bcrypt.cost);

  // Seed demo users
  const users = [
    {
      id: "550e8400-e29b-41d4-a716-446655440000",
      username: "demo_user",
      email: "demo@letterbookxd.local",
      passwordHash,
      displayName: "Demo User",
      avatarUrl: "",
      bio: "Welcome to LetterBookXD! This is a demo account.",
      readingPrivacy: "public",
      readingLanguage: JSON.stringify(["pt-BR", "en"]),
      emailVerified: true,
      lgpdConsent: JSON.stringify({ essential: true, analytics: false, marketing: false, thirdParty: false }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440001",
      username: "bookworm_maria",
      email: "maria@letterbookxd.local",
      passwordHash,
      displayName: "Maria Silva",
      avatarUrl: "",
      bio: "Amo ler! Principalmente fantasia e sci-fi.",
      readingPrivacy: "public",
      readingLanguage: JSON.stringify(["pt-BR", "en"]),
      emailVerified: true,
      lgpdConsent: JSON.stringify({ essential: true, analytics: false, marketing: false, thirdParty: false }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440002",
      username: "manga_kenji",
      email: "kenji@letterbookxd.local",
      passwordHash,
      displayName: "Kenji Tanaka",
      avatarUrl: "",
      bio: "Mangá é vida. One Piece forever! ?????",
      readingPrivacy: "followers",
      readingLanguage: JSON.stringify(["pt-BR", "en", "ja"]),
      emailVerified: true,
      lgpdConsent: JSON.stringify({ essential: true, analytics: false, marketing: false, thirdParty: false }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const user of users) {
    await Promise.all([
      redis.hSet(`user:id:${user.id}`, user),
      redis.set(`user:username:${user.username}`, user.id),
      redis.set(`user:email:${user.email}`, user.id),
      redis.sAdd("users:all", user.id),
    ]);
    console.log(`? Created user: ${user.username}`);
  }

  // Seed sample works (books from Open Library)
  const books = [
    {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1",
      source: "openlibrary",
      externalId: "OL27613W",
      title: "1984",
      coverUrl: "https://covers.openlibrary.org/b/id/8231851-L.jpg",
      description: "A dystopian social science fiction novel and cautionary tale about totalitarianism.",
      authors: JSON.stringify([{ id: "OL34184A", name: "George Orwell" }]),
      genres: JSON.stringify(["Dystopian", "Political Fiction", "Classic"]),
      publishedYear: 1949,
      ratingAverage: 4.5,
      ratingCount: 125000,
      isbn13: "9780451524935",
      isbn10: "0451524934",
      pageCount: 328,
      publisher: "Signet Classics",
      language: "en",
      subjects: JSON.stringify(["Totalitarianism", "Surveillance", "Dystopia"]),
      previewUrl: "https://books.google.com/books?id=Z4r7DwAAQBAJ",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee2",
      source: "openlibrary",
      externalId: "OL27448W",
      title: "To Kill a Mockingbird",
      coverUrl: "https://covers.openlibrary.org/b/id/8226191-L.jpg",
      description: "A novel about racial injustice and childhood innocence in the American South.",
      authors: JSON.stringify([{ id: "OL34180A", name: "Harper Lee" }]),
      genres: JSON.stringify(["Classic", "Legal Drama", "Coming of Age"]),
      publishedYear: 1960,
      ratingAverage: 4.7,
      ratingCount: 98000,
      isbn13: "9780061120084",
      isbn10: "0061120081",
      pageCount: 336,
      publisher: "J.B. Lippincott & Co.",
      language: "en",
      subjects: JSON.stringify(["Racial Injustice", "Alabama", "Lawyers"]),
      previewUrl: "https://books.google.com/books?id=PGR2AwAAQBAJ",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Seed sample works (manga from MangaDex)
  const manga = [
    {
      id: "bbbbbbbb-cccc-dddd-eeee-fffffffffff1",
      source: "mangadex",
      externalId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      title: "One Piece",
      coverUrl: "https://uploads.mangadex.org/covers/a1b2c3d4-e5f6-7890-abcd-ef1234567890/cover.256.jpg",
      description: "Monkey D. Luffy and his pirate crew search for the ultimate treasure.",
      authors: JSON.stringify([{ id: "author1", name: "Eiichiro Oda" }]),
      genres: JSON.stringify(["Action", "Adventure", "Fantasy", "Shonen"]),
      publishedYear: 1997,
      ratingAverage: 4.8,
      ratingCount: 45000,
      originalLanguage: "ja",
      demographic: "shonen",
      mangaStatus: "ongoing",
      chapterCount: 1100,
      year: 1997,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "bbbbbbbb-cccc-dddd-eeee-fffffffffff2",
      source: "mangadex",
      externalId: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
      title: "Attack on Titan",
      coverUrl: "https://uploads.mangadex.org/covers/b2c3d4e5-f6a7-8901-bcde-f23456789012/cover.256.jpg",
      description: "Humanity fights for survival against giant humanoid Titans.",
      authors: JSON.stringify([{ id: "author2", name: "Hajime Isayama" }]),
      genres: JSON.stringify(["Action", "Dark Fantasy", "Post-Apocalyptic", "Shonen"]),
      publishedYear: 2009,
      ratingAverage: 4.7,
      ratingCount: 38000,
      originalLanguage: "ja",
      demographic: "shonen",
      mangaStatus: "completed",
      chapterCount: 139,
      year: 2009,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Store works
  for (const work of [...books, ...manga]) {
    await redis.hSet(`work:${work.id}`, work);
    await redis.hSet(`work:source:${work.source}:${work.externalId}`, { id: work.id });
    console.log(`? Created work: ${work.title}`);
  }

  // Seed reading lists for demo_user
  const readingLists = [
    { userId: "550e8400-e29b-41d4-a716-446655440000", workId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1", workType: "book", status: "finished", rating: 4.5, progress: 328, totalProgress: 328, startedAt: "2024-01-15", finishedAt: "2024-02-10" },
    { userId: "550e8400-e29b-41d4-a716-446655440000", workId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee2", workType: "book", status: "reading", progress: 150, totalProgress: 336, startedAt: "2024-03-01" },
    { userId: "550e8400-e29b-41d4-a716-446655440000", workId: "bbbbbbbb-cccc-dddd-eeee-fffffffffff1", workType: "manga", status: "reading", progress: 50, totalProgress: 1100, startedAt: "2024-02-15" },
    { userId: "550e8400-e29b-41d4-a716-446655440000", workId: "bbbbbbbb-cccc-dddd-eeee-fffffffffff2", workType: "manga", status: "finished", rating: 5.0, progress: 139, totalProgress: 139, startedAt: "2024-01-10", finishedAt: "2024-01-25" },
  ];

  for (const item of readingLists) {
    const now = new Date().toISOString();
    const readingItem = {
      id: uuidv4(),
      userId: item.userId,
      workId: item.workId,
      workType: item.workType,
      status: item.status,
      rating: item.rating?.toString() || "",
      progress: item.progress.toString(),
      totalProgress: item.totalProgress?.toString() || "",
      notes: "",
      isPublic: "true",
      startedAt: item.startedAt || "",
      finishedAt: item.finishedAt || "",
      createdAt: now,
      updatedAt: now,
    };

    await redis.zAdd(`user:${item.userId}:reading_list`, { score: Date.now(), value: JSON.stringify({ ...readingItem, id: uuidv4(), ...item }) });
    await redis.zAdd(`user:${item.userId}:reading_list:by_work`, { score: Date.now(), value: item.workId });
    await redis.incr(`user:${item.userId}:stats:reading_list_count`);
    console.log(`? Added to reading list`);
  }

  // Seed follows
  await redis.sAdd("user:550e8400-e29b-41d4-a716-446655440000:following", "550e8400-e29b-41d4-a716-446655440001");
  await redis.sAdd("user:550e8400-e29b-41d4-a716-446655440001:followers", "550e8400-e29b-41d4-a716-446655440000");
  await redis.sAdd("user:550e8400-e29b-41d4-a716-446655440000:following", "550e8400-e29b-41d4-a716-446655440002");
  await redis.sAdd("user:550e8400-e29b-41d4-a716-446655440002:followers", "550e8400-e29b-41d4-a716-446655440000");
  await redis.sAdd("user:550e8400-e29b-41d4-a716-446655440001:following", "550e8400-e29b-41d4-a716-446655440000");
  await redis.sAdd("user:550e8400-e29b-41d4-a716-446655440000:followers", "550e8400-e29b-41d4-a716-446655440001");

  await redis.incr("user:550e8400-e29b-41d4-a716-446655440000:stats:following_count");
  await redis.incr("user:550e8400-e29b-41d4-a716-446655440001:stats:followers_count");
  await redis.incr("user:550e8400-e29b-41d4-a716-446655440000:stats:following_count");
  await redis.incr("user:550e8400-e29b-41d4-a716-446655440002:stats:followers_count");
  await redis.incr("user:550e8400-e29b-41d4-a716-446655440001:stats:following_count");
  await redis.incr("user:550e8400-e29b-41d4-a716-446655440000:stats:followers_count");

  console.log("? Seeding completed!");
  await redis.quit();
}

seed().catch(console.error);
