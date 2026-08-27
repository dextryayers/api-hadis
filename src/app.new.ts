import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { BOOKS, BOOK_IDS, normalizeBookId } from "./types.js";
import { getBookData, getHadithByNumber } from "./data.js";

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

app.get("/", (c) => {
  const baseUrl = "https://api-hadith.vercel.app";
  const accept = c.req.header("accept") || "";
  const wantsHtml = accept.includes("text/html");

  const payload = {
    message: "API Hadis Indonesia dan Arab 11 Kitab Utama",
    description: "API REST gratis tanpa API key untuk 40.274 hadis dan bab dari 11 kitab. Sembilan Kutubut Tisah ditambah Riyadhus Shalihin dan Musnad Syafii. Tiap data punya teks Arab dan terjemah Indonesia. Cocok untuk web, mobile, dan bot.",
    by: "Hanif Abdurrohim",
    version: "1.1.0",
    base_url: baseUrl,
    total_hadith: Object.values(BOOKS).reduce((a, b) => a + b.available, 0),
    available_books: BOOK_IDS.map((id) => ({
      id,
      name: BOOKS[id].name,
      arabicName: BOOKS[id].arabicName,
      available: BOOKS[id].available,
      example: `${baseUrl}/books/${id}`,
    })),
    quick_start: {
      title: "Cara pakai tiga langkah",
      steps: [
        `1. Pilih kitab: misal bukhari -> ${baseUrl}/books/bukhari`,
        `2. Ambil satu hadis: ${baseUrl}/books/bukhari/1`,
        `3. Cari: ${baseUrl}/books/bukhari/search?q=wudhu`,
      ],
      no_auth: "Tidak perlu API key dan tidak perlu login. Langsung fetch.",
      cors: "CORS aktif. Bisa dipanggil dari browser, React, Vue, React Native, Flutter.",
    },
    endpoints: [
      { method: "GET", path: "/", description: "Info API dan dokumentasi halaman ini", example: `${baseUrl}/` },
      { method: "GET", path: "/books", description: "Daftar 11 kitab plus jumlah hadis dan bab", example: `${baseUrl}/books` },
      { method: "GET", path: "/books/{id}", description: "Hadis per kitab dengan pagination", params: "id: bukhari, muslim, abu-daud, tirmidzi, nasai, ibnu-majah, ahmad, darimi, malik, riyadush-shalihin, musnad-syafii", query: "page default 1, limit default 20 max 100, range contoh 1-50", examples: [`${baseUrl}/books/bukhari`, `${baseUrl}/books/musnad-syafii?page=1&limit=10`, `${baseUrl}/books/riyadush-shalihin?range=1-5`] },
      { method: "GET", path: "/books/{id}/{number}", description: "Detail satu hadis berdasar nomor", example: `${baseUrl}/books/bukhari/1` },
      { method: "GET", path: "/books/{id}/search", description: "Cari di kitab tertentu, cari di terjemah", query: "q minimal 2 huruf, page, limit", examples: [`${baseUrl}/books/bukhari/search?q=wudhu`, `${baseUrl}/books/musnad-syafii/search?q=puasa&limit=5`] },
      { method: "GET", path: "/search", description: "Cari di semua kitab", examples: [`${baseUrl}/search?q=puasa&limit=10`, `${baseUrl}/search?q=shalat`] },
      { method: "GET", path: "/books/{id}/random", description: "Hadis acak per kitab", examples: [`${baseUrl}/books/bukhari/random`, `${baseUrl}/books/musnad-syafii/random`] },
      { method: "GET", path: "/random", description: "Hadis acak dari 11 kitab atau filter book", examples: [`${baseUrl}/random`, `${baseUrl}/random?book=musnad-syafii`] },
    ],
    pagination_guide: {
      why: "Vercel batasi response sekitar 5MB. Full Bukhari 6638 hadis sekitar 12MB, tidak bisa kirim sekaligus.",
      solusi: "Pakai pagination page dan limit atau pakai range.",
      contoh: [
        `${baseUrl}/books/bukhari?page=1&limit=20  20 pertama`,
        `${baseUrl}/books/bukhari?page=2&limit=20  20 selanjutnya`,
        `${baseUrl}/books/bukhari?range=1-100  nomor 1 sampai 100`,
        `Loop page 1 sampai totalPages untuk dapat full 6638`,
      ],
      max_limit: "100 per request",
      response_pagination: `{ pagination: { page, limit, total, totalPages, hasNext, hasPrev }, data: [...] }`,
    },
    fields: {
      hadith_object: `{ number: 1, arab: "teks arab", id: "terjemahan" }`,
      descriptions: [
        { field: "number", type: "number", desc: "Nomor hadis atau nomor bab untuk Riyadhus dan Musnad Syafii" },
        { field: "arab", type: "string", desc: "Teks Arab lengkap dengan sanad" },
        { field: "id", type: "string", desc: "Terjemahan Indonesia, sudah bersih dari tag HTML" },
        { field: "book", type: "string", desc: "ID kitab, muncul di search dan random" },
        { field: "html", type: "string", desc: "Terjemah HTML asli untuk Riyadhus dan Musnad, opsional" },
      ],
    },
    errors: [
      { code: 404, contoh: `GET ${baseUrl}/books/unknown`, response: `{ error: "Kitab tidak ditemukan" }` },
      { code: 404, contoh: `GET ${baseUrl}/books/bukhari/99999`, response: `{ error: "Hadis no 99999 tidak ditemukan" }` },
      { code: 400, contoh: `GET ${baseUrl}/books/bukhari/search tanpa q`, response: `{ error: "query param q minimal 2 karakter" }` },
      { code: 400, contoh: `GET ${baseUrl}/books/bukhari?range=abc`, response: `{ error: "format range salah" }` },
    ],
    code_examples: {
      curl: `curl ${baseUrl}/books/bukhari/1\ncurl ${baseUrl}/books/musnad-syafii?page=1&limit=5\ncurl "${baseUrl}/books/riyadush-shalihin/search?q=tawakkal&limit=2"`,
      javascript: `// Browser Node React\nfetch('${baseUrl}/books/bukhari/1')\n  .then(r=>r.json()).then(console.log)\n\n// Pagination full kitab\nlet page=1; while(true){\n  const r=await fetch('${baseUrl}/books/bukhari?page='+page+'&limit=100');\n  const j=await r.json();\n  console.log(j.data);\n  if(!j.pagination.hasNext) break;\n  page++;\n}`,
      python: `import requests\nr = requests.get('${baseUrl}/books/musnad-syafii/1')\nprint(r.json())\n\n# search\nr = requests.get('${baseUrl}/search', params={'q':'puasa','limit':5})\nprint(r.json()['data'])`,
    },
    usage_notes: [
      "Full kitab pakai pagination default 20 untuk hindari limit 5MB Vercel. Pakai page dan limit atau range untuk ambil semua, loop page 1 sampai totalPages.",
      "Semua response JSON pakai format data dan pagination.",
      "CORS aktif, bisa dipanggil dari frontend mana saja.",
      "Data Arab dan Indonesia ada di field arab dan id. Untuk Riyadhus dan Musnad ada field html juga.",
      "Tidak perlu API key, gratis, rate limit wajar Vercel.",
    ],
    credits: {
      author: "Hanif Abdurrohim",
      github: "https://github.com/dextryayers",
      data_source: "11 kitab dari folder assets",
    },
    deployed_on: "Vercel https://api-hadith.vercel.app",
  };

  if (wantsHtml) {
    const booksHtml = Object.values(BOOKS)
      .map(
        (b) => `
        <tr>
          <td><code>${b.id}</code></td>
          <td>${b.name}<br><small>${b.arabicName}</small></td>
          <td>${b.available.toLocaleString("id-ID")}</td>
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
          ${e.params ? `<small><b>Params:</b> ${e.params}</small><br>` : ""}
          ${e.query ? `<small><b>Query:</b> ${e.query}</small><br>` : ""}
          ${e.examples ? `<small><b>Contoh:</b> ${e.examples.map((ex: string) => `<a href="${ex}" target="_blank">${ex}</a>`).join(" • ")}</small>` : ""}
          ${e.example ? `<small><b>Contoh:</b> <a href="${e.example}" target="_blank">${e.example}</a></small>` : ""}
        </div>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>API Hadis 11 Kitab - By Hanif Abdurrohim</title>
<meta name="description" content="API Hadis 11 kitab gratis tanpa API key. 40 ribu hadis Arab dan Indonesia.">
<style>
  :root{--teal:#0f766e;--teal-dark:#115e59;--slate:#1e293b;--muted:#64748b;--bg:#f8fafc;--card:#ffffff;--border:#e2e8f0;--code:#f1f5f9;--radius:14px}
  *{box-sizing:border-box} html{scroll-behavior:smooth}
  body{font-family:Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin:0; color:var(--slate); background:var(--bg); line-height:1.65; -webkit-font-smoothing:antialiased}
  a{color:var(--teal); text-decoration:none} a:hover{text-decoration:underline}
  header{position:sticky; top:0; z-index:30; background:rgba(255,255,255,0.92); backdrop-filter:blur(8px); border-bottom:1px solid var(--border)}
  .wrap{max-width:1120px; margin:0 auto; padding:0 20px}
  .header-inner{display:flex; align-items:center; gap:16px; padding:14px 0; flex-wrap:wrap}
  .brand{font-weight:800; color:var(--teal); font-size:18px; letter-spacing:-0.03em; line-height:1.1}
  .brand small{display:block; font-weight:500; color:var(--muted); font-size:11px; letter-spacing:0; margin-top:2px}
  .nav{display:flex; gap:8px; flex-wrap:wrap; margin-left:auto}
  .nav a{font-size:12px; padding:7px 12px; border:1px solid var(--border); border-radius:999px; background:var(--card); color:var(--slate); font-weight:600}
  .nav a:hover{border-color:var(--teal); color:var(--teal); text-decoration:none}
  .hero{padding:28px 0 8px; display:grid; grid-template-columns:1.25fr 0.75fr; gap:20px} @media(max-width:900px){.hero{grid-template-columns:1fr}}
  .hero h1{margin:0; font-size:32px; letter-spacing:-0.03em; line-height:1.15}
  .hero p{color:var(--muted); margin:10px 0 0; font-size:14px}
  .chips{display:flex; gap:8px; flex-wrap:wrap; margin-top:14px}
  .chip{font-size:11px; padding:6px 10px; border-radius:999px; border:1px solid var(--border); background:var(--card); font-weight:600}
  .chip.teal{background:var(--teal); color:white; border-color:var(--teal)}
  .chip.dark{background:var(--slate); color:#f1f5f9; border-color:var(--slate)}
  .grid2{display:grid; grid-template-columns:1fr 1fr; gap:14px} @media(max-width:860px){.grid2{grid-template-columns:1fr}}
  .card{background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:16px}
  h2{font-size:17px; margin:32px 0 10px; letter-spacing:-0.02em; color:var(--slate); display:flex; align-items:center; gap:10px}
  h2 span.num{width:28px; height:28px; display:inline-grid; place-items:center; background:var(--teal); color:white; border-radius:8px; font-size:12px; font-weight:800}
  h3{font-size:13px; margin:14px 0 8px; color:var(--slate)}
  table{width:100%; border-collapse:separate; border-spacing:0; overflow:hidden; border:1px solid var(--border); border-radius:12px; background:var(--card); font-size:13px}
  th,td{padding:10px 12px; text-align:left; border-bottom:1px solid var(--border)} th{background:#f8fafc; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted)} tr:last-child td{border-bottom:none}
  code{background:var(--code); padding:2px 6px; border-radius:6px; font-size:12px; border:1px solid var(--border); font-family:ui-monospace, SFMono-Regular, Menlo, monospace}
  pre{background:#0f172a; color:#e2e8f0; padding:14px; border-radius:12px; overflow:auto; font-size:12px; line-height:1.6; border:1px solid #1e293b}
  pre code{background:transparent; border:none; color:inherit; padding:0}
  .endpoint{background:var(--card); border:1px solid var(--border); border-left:3px solid var(--teal); border-radius:12px; padding:14px 16px; margin:10px 0}
  .endpoint p{margin:6px 0 0; color:var(--muted); font-size:13px}
  .method{display:inline-block; background:var(--teal); color:white; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:800; letter-spacing:0.04em}
  .callout{border-radius:12px; padding:12px 14px; font-size:13px; border:1px solid; line-height:1.6}
  .callout.info{background:#f0fdfa; border-color:#99f6e4; color:#134e4a}
  .callout.warn{background:#fffbeb; border-color:#fcd34d; color:#92400e}
  .tester{background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:18px; box-shadow:0 8px 24px rgba(15,118,110,0.07)}
  .input, select{width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:10px; background:white; font-size:13px}
  .input:focus, select:focus{outline:none; border-color:var(--teal); box-shadow:0 0 0 3px rgba(15,118,110,0.12)}
  .btn{appearance:none; border:none; padding:10px 16px; border-radius:10px; font-weight:700; font-size:13px; cursor:pointer}
  .btn.primary{background:var(--teal); color:white} .btn.primary:hover{background:var(--teal-dark)}
  .btn.ghost{background:white; border:1px solid var(--border); color:var(--slate)}
  .badge{font-size:11px; padding:4px 8px; border-radius:999px; border:1px solid var(--border); background:var(--card)}
  footer{margin-top:36px; padding:20px 0; border-top:1px solid var(--border); color:var(--muted); font-size:12px; text-align:center}
  .kicker{font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:var(--teal); font-weight:800}
  .mono{font-family:ui-monospace, SFMono-Regular, Menlo, monospace}
</style>
</head>
<body>
<header>
  <div class="wrap header-inner">
    <div class="brand">API Hadis <small>11 kitab • https://api-hadith.vercel.app • By Hanif Abdurrohim</small></div>
    <nav class="nav">
      <a href="#quick">Quick start</a>
      <a href="#kitab">Kitab</a>
      <a href="#endpoints">Endpoints</a>
      <a href="#tester">Tester</a>
      <a href="https://github.com/dextryayers" target="_blank">GitHub</a>
    </nav>
  </div>
</header>

<div class="wrap">
  <section class="hero">
    <div>
      <div class="kicker">Gratis • Tanpa API key • CORS aktif</div>
      <h1>API Hadis 11 Kitab untuk aplikasi Indonesia</h1>
      <p>Akses 40.274 hadis dan bab dari 11 kitab. Sembilan Kutubut Tisah ditambah Riyadhus Shalihin dan Musnad Syafii. Tiap data punya teks Arab dan terjemah Indonesia. Siap pakai untuk web, mobile, dan bot.</p>
      <div class="chips">
        <span class="chip teal">REST • JSON</span>
        <span class="chip">40.274 data</span>
        <span class="chip">Arab dan Indonesia</span>
        <span class="chip dark">Vercel Ready</span>
      </div>
      <div class="card" style="margin-top:16px; display:flex; gap:10px; align-items:center; flex-wrap:wrap">
        <code style="flex:1" class="mono">GET https://api-hadith.vercel.app/books/bukhari/1</code>
        <a class="btn primary" href="https://api-hadith.vercel.app/books/bukhari/1" target="_blank">Coba</a>
        <a class="btn ghost" href="#tester">Buka tester</a>
      </div>
    </div>
    <div class="card">
      <div class="kicker">Info</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:8px">
        <div><div style="font-size:11px; color:var(--muted)">Total</div><div style="font-weight:800; font-size:22px">\${payload.total_hadith.toLocaleString("id-ID")}</div><div style="font-size:11px; color:var(--muted)">hadis dan bab</div></div>
        <div><div style="font-size:11px; color:var(--muted)">Kitab</div><div style="font-weight:800; font-size:22px">\${payload.available_books.length}</div><div style="font-size:11px; color:var(--muted)">11 kitab</div></div>
      </div>
      <div style="margin-top:12px; font-size:11px; color:var(--muted)">Base URL produksi</div>
      <code class="mono">https://api-hadith.vercel.app</code>
      <div style="margin-top:12px" class="callout info"><b>Untuk pemula:</b> Kirim request GET lewat URL, server balas JSON. Tidak perlu login. Cukup fetch atau curl.</div>
    </div>
  </section>

  <section id="quick">
    <h2><span class="num">1</span> Quick start tiga langkah</h2>
    <div class="grid2">
      <div class="card">
        <h3>Langkah 1: Lihat daftar kitab</h3>
        <pre><code>curl https://api-hadith.vercel.app/books</code></pre>
        <p style="font-size:12px; color:var(--muted)">Dapat 11 ID kitab yang bisa dipakai di endpoint lain.</p>
      </div>
      <div class="card">
        <h3>Langkah 2: Ambil satu hadis</h3>
        <pre><code>curl https://api-hadith.vercel.app/books/bukhari/1</code></pre>
        <p style="font-size:12px; color:var(--muted)">Ganti bukhari dengan muslim, musnad-syafii, atau riyadush-shalihin.</p>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <h3>Langkah 3: Cari hadis</h3>
      <pre><code>curl "https://api-hadith.vercel.app/books/bukhari/search?q=wudhu&limit=5"</code></pre>
      <p style="font-size:12px; color:var(--muted)">Cari di semua kitab pakai <code>/search?q=puasa</code>. Tidak perlu API key, CORS sudah aktif.</p>
    </div>
  </section>

  <section id="kitab">
    <h2><span class="num">2</span> Daftar kitab</h2>
    <p style="font-size:13px; color:var(--muted)">Gunakan ID persis seperti di tabel. Contoh: <code>abu-daud</code> pakai strip, bukan spasi.</p>
    <div style="overflow:auto; border-radius:12px; border:1px solid var(--border)">
      <table>
        <tr><th>ID</th><th>Nama</th><th>Jumlah</th><th>Coba</th></tr>
        \${booksHtml}
        <tr style="font-weight:700; background:#f8fafc"><td colspan="2">Total</td><td>\${payload.total_hadith.toLocaleString("id-ID")}</td><td>11 kitab</td></tr>
      </table>
    </div>
  </section>

  <section id="endpoints">
    <h2><span class="num">3</span> Endpoints</h2>
    <p style="font-size:13px; color:var(--muted)">Semua endpoint pakai GET. Klik contoh untuk coba langsung.</p>
    \${endpointsHtml}
  </section>

  <section id="pagination">
    <h2><span class="num">4</span> Pagination dan range</h2>
    <div class="callout warn"><b>Kenapa tidak bisa ambil full sekaligus?</b> Vercel batasi response sekitar 5MB. Satu kitab full bisa 12MB, jadi harus pakai halaman.</div>
    <div class="grid2" style="margin-top:12px">
      <div class="card">
        <h3>Cara pagination</h3>
        <pre><code>GET /books/bukhari?page=1&limit=20
GET /books/bukhari?page=2&limit=20
GET /books/musnad-syafii?page=1&limit=50</code></pre>
        <p style="font-size:12px; color:var(--muted)">Response punya <code>pagination: {page, limit, total, totalPages, hasNext}</code>. Max limit 100.</p>
      </div>
      <div class="card">
        <h3>Cara range</h3>
        <pre><code>GET /books/bukhari?range=1-10
GET /books/muslim?range=100-120
GET /books/riyadush-shalihin?range=7-7</code></pre>
        <p style="font-size:12px; color:var(--muted)">Range pakai nomor hadis, bukan index halaman. Cocok untuk ambil blok kecil.</p>
      </div>
    </div>
  </section>

  <section id="fields">
    <h2><span class="num">5</span> Struktur data</h2>
    <pre><code>{
  "number": 1,
  "arab": "teks Arab lengkap dengan sanad",
  "id": "terjemahan Indonesia"
}</code></pre>
    <table>
      <tr><th>Field</th><th>Tipe</th><th>Keterangan</th></tr>
      \${(payload.fields as any).descriptions.map((f: any) => '<tr><td><code>' + f.field + '</code></td><td>' + f.type + '</td><td>' + f.desc + '</td></tr>').join("")}
    </table>
    <p style="font-size:12px; color:var(--muted)">Untuk Riyadhus dan Musnad Syafii, response juga punya <code>html</code> berisi terjemah asli. Search dan random tambah <code>book</code>.</p>
  </section>

  <section id="errors">
    <h2><span class="num">6</span> Error</h2>
    <table>
      <tr><th>Status</th><th>Contoh</th><th>Balasan</th></tr>
      \${(payload.errors as any[]).map((e: any) => '<tr><td>' + e.code + '</td><td><code>' + e.contoh + '</code></td><td><code>' + e.response + '</code></td></tr>').join("")}
    </table>
    <p style="font-size:12px; color:var(--muted)">Semua error berbentuk <code>{ "error": "pesan" }</code>.</p>
  </section>

  <section id="examples">
    <h2><span class="num">7</span> Contoh kode</h2>
    <div class="grid2">
      <div class="card">
        <h3>cURL</h3>
        <pre><code>\${(payload.code_examples as any).curl}</code></pre>
      </div>
      <div class="card">
        <h3>Python</h3>
        <pre><code>\${(payload.code_examples as any).python.replace(/</g, "&lt;")}</code></pre>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <h3>JavaScript</h3>
      <pre><code>\${(payload.code_examples as any).javascript.replace(/</g, "&lt;")}</code></pre>
    </div>
  </section>

  <section id="tester">
    <h2><span class="num">8</span> Live tester</h2>
    <p style="font-size:13px; color:var(--muted)">Satu tester untuk semua route. Pilih endpoint, isi parameter, klik GET. Hasil real dari <code>https://api-hadith.vercel.app</code>.</p>
