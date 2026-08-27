import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { BOOKS, BOOK_IDS } from "./types.js";
import { getBookData, getHadithByNumber } from "./data.js";

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

// Root info - lengkap + By Hanif (HTML untuk browser, JSON untuk API)
app.get("/", (c) => {
  const baseUrl = new URL(c.req.url).origin;
  const accept = c.req.header("accept") || "";
  const wantsHtml = accept.includes("text/html");

  const payload = {
    message: "API Hadis Indonesia & Arab - 9 Kitab Utama",
    description:
      "API REST untuk mengakses 38.102 hadis dari 9 kitab utama (Kutubut Tis'ah) lengkap dengan teks Arab dan terjemahan Indonesia. Data bersumber dari hadis shahih & sunan. Siap pakai untuk aplikasi mobile, web, atau bot.",
    by: "Hanif Abdurrohim",
    version: "1.0.0",
    base_url: baseUrl,
    total_hadith: Object.values(BOOKS).reduce((a, b) => a + b.available, 0),
    available_books: BOOK_IDS.map((id) => ({
      id,
      name: BOOKS[id].name,
      arabicName: BOOKS[id].arabicName,
      available: BOOKS[id].available,
      example: `${baseUrl}/books/${id}`,
    })),
    endpoints: [
      {
        method: "GET",
        path: "/",
        description: "Info API & dokumentasi (halaman ini)",
        example: `${baseUrl}/`,
      },
      {
        method: "GET",
        path: "/books",
        description: "Daftar 9 kitab + jumlah hadis",
        example: `${baseUrl}/books`,
      },
      {
        method: "GET",
        path: "/books/{id}",
        description: "Tampilkan hadis per kitab (full kitab dengan pagination)",
        params: "id: bukhari | muslim | abu-daud | tirmidzi | nasai | ibnu-majah | ahmad | darimi | malik",
        query: "page (default 1), limit (default 20, max 100), range (contoh 1-50)",
        examples: [
          `${baseUrl}/books/bukhari`,
          `${baseUrl}/books/muslim?page=2&limit=20`,
          `${baseUrl}/books/bukhari?range=1-10`,
          `${baseUrl}/books/nasai?range=100-120`,
        ],
      },
      {
        method: "GET",
        path: "/books/{id}/{number}",
        description: "Detail 1 hadis berdasarkan nomor",
        example: `${baseUrl}/books/bukhari/1`,
      },
      {
        method: "GET",
        path: "/books/{id}/search",
        description: "Cari hadis di kitab tertentu (search teks terjemahan)",
        query: "q (minimal 2 huruf), page, limit",
        examples: [`${baseUrl}/books/bukhari/search?q=wudhu`, `${baseUrl}/books/muslim/search?q=niat&limit=5`],
      },
      {
        method: "GET",
        path: "/search",
        description: "Cari hadis di semua kitab",
        examples: [`${baseUrl}/search?q=puasa&limit=10`, `${baseUrl}/search?q=shalat`],
      },
      {
        method: "GET",
        path: "/books/{id}/random",
        description: "Hadis acak dari kitab tertentu",
        examples: [`${baseUrl}/books/bukhari/random`, `${baseUrl}/books/muslim/random`],
      },
      {
        method: "GET",
        path: "/random",
        description: "Hadis acak dari 9 kitab (atau filter ?book=)",
        examples: [`${baseUrl}/random`, `${baseUrl}/random?book=tirmidzi`],
      },
    ],
    usage_notes: [
      "Full kitab dikembalikan dengan pagination (default 20) untuk menghindari limit 5MB Vercel. Gunakan ?page & ?limit atau ?range untuk ambil semua (loop page 1..N).",
      "Semua response JSON dengan format { data, pagination, ... }.",
      "CORS enabled - bisa dipanggil dari frontend mana saja.",
      "Data Arab & Indonesia tersedia di field 'arab' dan 'id'.",
    ],
    credits: {
      author: "Hanif Abdurrohim",
      github: "https://github.com/hanifabdurrohim",
      data_source: "9 file JSON lokal (Kutubut Tis'ah)",
    },
    deployed_on: "Vercel - https://vercel.com",
  };

  if (wantsHtml) {
    const booksHtml = Object.values(BOOKS)
      .map(
        (b) => `
        <tr>
          <td><code>${b.id}</code></td>
          <td>${b.name}<br><small>${b.arabicName}</small></td>
          <td>${b.available}</td>
          <td><a href="${baseUrl}/books/${b.id}" target="_blank">${baseUrl}/books/${b.id}</a></td>
        </tr>`
      )
      .join("");

    const endpointsHtml = (payload.endpoints as any[])
      .map(
        (e) => `
        <div class="endpoint">
          <span class="method">${e.method}</span> <code>${e.path}</code>
          <p>${e.description}</p>
          ${e.params ? `<small>Params: ${e.params}</small><br>` : ""}
          ${e.query ? `<small>Query: ${e.query}</small><br>` : ""}
          ${e.examples ? `<small>Contoh: ${e.examples.map((ex: string) => `<a href="${ex}" target="_blank">${ex}</a>`).join(", ")}</small>` : ""}
          ${e.example ? `<small>Contoh: <a href="${e.example}" target="_blank">${e.example}</a></small>` : ""}
        </div>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>API Hadis - By Hanif Abdurrohim</title>
<style>
  *{box-sizing:border-box} body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif; max-width:900px; margin:0 auto; padding:24px; line-height:1.6; color:#1a1a1a; background:#fafaf9}
  header{border-bottom:3px solid #0f766e; padding-bottom:16px; margin-bottom:24px}
  h1{margin:0; color:#0f766e} h2{color:#0f766e; margin-top:32px; border-left:4px solid #0f766e; padding-left:12px}
  .by{color:#57534e; margin:4px 0 0} .badge{display:inline-block; background:#0f766e; color:white; padding:2px 10px; border-radius:999px; font-size:12px; margin-right:6px}
  table{width:100%; border-collapse:collapse; margin:12px 0} th,td{border:1px solid #e7e5e4; padding:8px 10px; text-align:left} th{background:#f0fdfa}
  .endpoint{background:white; border:1px solid #e7e5e4; border-left:4px solid #0f766e; padding:12px 16px; margin:12px 0; border-radius:8px}
  .method{background:#0f766e; color:white; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold}
  code{background:#f0fdfa; padding:2px 6px; border-radius:4px; font-size:13px} a{color:#0f766e} a:hover{opacity:0.8}
  pre code{background:transparent !important; color:#e7fffe !important; padding:0; border:none; font-size:13px; line-height:1.7}
  pre{color:#e7fffe; border:1px solid #1e293b}
  footer{margin-top:40px; padding-top:16px; border-top:1px solid #e7e5e4; text-align:center; color:#57534e; font-size:14px}
  .notes li{margin:6px 0}
</style>
</head>
<body>
<header>
  <h1>📚 API Hadis - 9 Kitab Utama</h1>
  <p class="by">By - <strong>Hanif Abdurrohim</strong> • v1.0.0 • ${payload.total_hadith.toLocaleString("id-ID")} hadis</p>
  <p>${payload.description}</p>
  <div><span class="badge">REST</span><span class="badge">JSON</span><span class="badge">CORS</span><span class="badge">Vercel Ready</span></div>
</header>

<h2>📖 Daftar Kitab</h2>
<table>
  <tr><th>ID</th><th>Nama</th><th>Jumlah</th><th>Endpoint</th></tr>
  ${booksHtml}
  <tr style="font-weight:bold; background:#f0fdfa"><td colspan="2">Total</td><td>${payload.total_hadith}</td><td></td></tr>
</table>

<h2>🔗 Endpoints</h2>
${endpointsHtml}

<h2>📝 Catatan Penggunaan</h2>
<ul class="notes">
  ${payload.usage_notes.map((n) => `<li>${n}</li>`).join("")}
</ul>

<h2>💡 Contoh Cepat</h2>
<pre style="background:#1c1917; color:#fafaf9; padding:16px; border-radius:8px; overflow:auto"><code>curl ${baseUrl}/books/bukhari/1
curl ${baseUrl}/books/muslim?page=1&limit=5
curl ${baseUrl}/books/bukhari?range=1-10
curl ${baseUrl}/search?q=niat
fetch('${baseUrl}/random').then(r=>r.json()).then(console.log)</code></pre>

<footer>
  <p>© ${new Date().getFullYear()} By - <strong>Hanif Abdurrohim</strong> • Built with Hono + TypeScript • Deployed on Vercel</p>
  <p><small>Data: 9 JSON Kutubut Tis'ah | Field: <code>arab</code> & <code>id</code></small></p>
  <p><a href="${baseUrl}/books" target="_blank">Lihat /books (JSON)</a> • <a href="https://github.com/hanifabdurrohim" target="_blank">GitHub</a></p>
</footer>
</body>
</html>`;
    return c.html(html);
  }

  return c.json(payload);
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
