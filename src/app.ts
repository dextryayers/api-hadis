import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { BOOKS, BOOK_IDS } from "./types.js";
import { getBookData, getHadithByNumber } from "./data.js";

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

// Root info
app.get("/", (c) => {
  return c.json({
    message: "API Hadis - 9 Kitab",
    version: "1.0.0",
    endpoints: {
      books: "/books",
      book_detail: "/books/{id}  e.g. /books/bukhari",
      book_paginated: "/books/{id}?page=1&limit=20  or ?range=1-10",
      hadith_detail: "/books/{id}/{number}  e.g. /books/bukhari/1",
      search: "/books/{id}/search?q=niat",
      random: "/books/{id}/random  or /random?book=bukhari",
      all_books_search: "/search?q=niat",
    },
    available_books: BOOK_IDS,
    total_hadith: Object.values(BOOKS).reduce((a, b) => a + b.available, 0),
  });
});

// List all books
app.get("/books", (c) => {
  const books = Object.values(BOOKS).map((b) => ({
    id: b.id,
    name: b.name,
    arabicName: b.arabicName,
    available: b.available,
    endpoint: `/books/${b.id}`,
  }));
  return c.json({
    data: books,
    total: books.length,
  });
});

// Search across all books? /search?q=
app.get("/search", (c) => {
  const q = c.req.query("q");
  if (!q || q.trim().length < 2) {
    return c.json({ error: "query param 'q' minimal 2 karakter" }, 400);
  }
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 50);
  const lowerQ = q.toLowerCase();
  const results: any[] = [];

  for (const bookId of BOOK_IDS) {
    const data = getBookData(bookId);
    const matched = data.filter((h) => h.id.toLowerCase().includes(lowerQ));
    for (const h of matched.slice(0, limit)) {
      results.push({ book: bookId, ...h });
      if (results.length >= limit) break;
    }
    if (results.length >= limit) break;
  }

  return c.json({
    query: q,
    total: results.length,
    data: results,
  });
});

// Random hadith
app.get("/random", (c) => {
  const bookParam = c.req.query("book");
  const bookId = bookParam && BOOKS[bookParam] ? bookParam : BOOK_IDS[Math.floor(Math.random() * BOOK_IDS.length)];
  const data = getBookData(bookId);
  const random = data[Math.floor(Math.random() * data.length)];
  return c.json({ book: bookId, data: random });
});

// --- Per-book routes ---

// GET /books/:book  -> full or paginated
app.get("/books/:book", (c) => {
  const bookId = c.req.param("book");
  const book = BOOKS[bookId];
  if (!book) {
    return c.json({ error: `Kitab tidak ditemukan: ${bookId}`, available: BOOK_IDS }, 404);
  }

  const data = getBookData(bookId);

  // Query handling: range, page/limit, or full
  const range = c.req.query("range"); // e.g. 1-20 or 1,20
  const pageParam = c.req.query("page");
  const limitParam = c.req.query("limit");

  // Range mode: ?range=1-20
  if (range) {
    const normalized = range.replace(",", "-");
    const [startStr, endStr] = normalized.split("-");
    const start = parseInt(startStr);
    const end = parseInt(endStr);
    if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
      return c.json({ error: "format range salah, contoh: ?range=1-20" }, 400);
    }
    const sliced = data.filter((h) => h.number >= start && h.number <= end);
    return c.json({
      book: bookId,
      name: book.name,
      range: `${start}-${end}`,
      total: sliced.length,
      data: sliced,
    });
  }

  // Paginated mode
  const page = parseInt(pageParam || "1");
  const limit = parseInt(limitParam || "20");

  if (pageParam || limitParam) {
    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1 || limit > 100) {
      return c.json({ error: "page >=1 dan limit 1-100" }, 400);
    }
    const startIdx = (page - 1) * limit;
    const paginated = data.slice(startIdx, startIdx + limit);
    return c.json({
      book: bookId,
      name: book.name,
      pagination: {
        page,
        limit,
        total: data.length,
        totalPages: Math.ceil(data.length / limit),
        hasNext: startIdx + limit < data.length,
        hasPrev: page > 1,
      },
      data: paginated,
    });
  }

  // Default: paginated page 1 limit 20, but provide hint for full
  // To get full kitab, client can paginate or use ?limit=100 loop
  // We keep default paginated to avoid 12MB response jebol Vercel limit
  const defaultLimit = 20;
  const paginated = data.slice(0, defaultLimit);
  return c.json({
    book: bookId,
    name: book.name,
    arabicName: book.arabicName,
    available: data.length,
    pagination: {
      page: 1,
      limit: defaultLimit,
      total: data.length,
      totalPages: Math.ceil(data.length / defaultLimit),
      hasNext: data.length > defaultLimit,
    },
    hint: `Gunakan ?page=2&limit=20 untuk halaman selanjutnya, atau ?range=1-100 untuk range, atau ?limit=100&page=1 untuk ambil 100 sekaligus (max 100 per request). Untuk full ${data.length} hadis, loop paginasi.`,
    data: paginated,
  });
});

// GET /books/:book/search?q=
app.get("/books/:book/search", (c) => {
  const bookId = c.req.param("book");
  if (!BOOKS[bookId]) return c.json({ error: "Kitab tidak ditemukan" }, 404);
  const q = c.req.query("q");
  if (!q || q.trim().length < 2) return c.json({ error: "query param 'q' minimal 2 karakter" }, 400);
  const lowerQ = q.toLowerCase();
  const data = getBookData(bookId);
  const matched = data.filter((h) => h.id.toLowerCase().includes(lowerQ));
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
  const page = parseInt(c.req.query("page") || "1");
  const start = (page - 1) * limit;
  const sliced = matched.slice(start, start + limit);
  return c.json({
    book: bookId,
    query: q,
    pagination: { page, limit, total: matched.length, totalPages: Math.ceil(matched.length / limit) },
    data: sliced,
  });
});

// GET /books/:book/random
app.get("/books/:book/random", (c) => {
  const bookId = c.req.param("book");
  if (!BOOKS[bookId]) return c.json({ error: "Kitab tidak ditemukan" }, 404);
  const data = getBookData(bookId);
  const random = data[Math.floor(Math.random() * data.length)];
  return c.json({ book: bookId, data: random });
});

// GET /books/:book/:number  -> single hadith
app.get("/books/:book/:number", (c) => {
  const bookId = c.req.param("book");
  const numStr = c.req.param("number");
  if (!BOOKS[bookId]) return c.json({ error: "Kitab tidak ditemukan" }, 404);
  const num = parseInt(numStr);
  if (isNaN(num)) return c.json({ error: "number harus angka" }, 400);
  const hadith = getHadithByNumber(bookId, num);
  if (!hadith) return c.json({ error: `Hadis no ${num} tidak ditemukan di ${bookId}` }, 404);
  return c.json({ book: bookId, data: hadith });
});

// 404 handler
app.notFound((c) => c.json({ error: "Endpoint tidak ditemukan", path: c.req.path }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal Server Error", message: err.message }, 500);
});

export default app;
