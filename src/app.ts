import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { BOOKS, BOOK_IDS, normalizeBookId } from "./types.js";
import { getBookData, getHadithByNumber } from "./data.js";

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

// Root info - lengkap + By Hanif (HTML untuk browser, JSON untuk API)
app.get("/", (c) => {
  const baseUrl = "https://api-hadith.vercel.app";
  const accept = c.req.header("accept") || "";
  const wantsHtml = accept.includes("text/html");

  const payload = {
    message: "API Hadis Indonesia & Arab - 10 Kitab Utama",
    description:
      "API REST gratis, tanpa API key, untuk mengakses 38.474 hadis & bab dari 10 kitab utama (9 Kutubut Tis'ah + Riyadhus Shalihin) lengkap dengan teks Arab dan terjemahan Indonesia. Cocok untuk aplikasi mobile, web, bot Telegram/WhatsApp, atau pembelajaran.",
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
    quick_start: {
      title: "Cara Pakai (3 Langkah)",
      steps: [
        `1. Pilih kitab: misal bukhari -> ${baseUrl}/books/bukhari`,
        `2. Ambil 1 hadis: ${baseUrl}/books/bukhari/1`,
        `3. Atau cari: ${baseUrl}/books/bukhari/search?q=wudhu`,
      ],
      no_auth: "Tidak perlu API key, tidak perlu login. Langsung fetch.",
      cors: "CORS sudah aktif, bisa dipanggil dari browser, React, Vue, React Native, Flutter (via http).",
    },
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
        description: "Daftar 10 kitab + jumlah hadis & bab",
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
        description: "Hadis acak dari 10 kitab (atau filter ?book=)",
        examples: [`${baseUrl}/random`, `${baseUrl}/random?book=riyadush-shalihin`],
      },
    ],
    pagination_guide: {
      why: "Vercel membatasi response ~5MB. Full Bukhari 6638 hadis = 12MB, tidak bisa dikirim sekaligus.",
      solusi: "Gunakan pagination ?page & ?limit atau ?range.",
      contoh: [
        `${baseUrl}/books/bukhari?page=1&limit=20  -> 20 pertama`,
        `${baseUrl}/books/bukhari?page=2&limit=20  -> 20 selanjutnya`,
        `${baseUrl}/books/bukhari?range=1-100     -> nomor 1 sampai 100`,
        `Loop page 1..332 untuk dapat full 6638 (332 x 20)`,
      ],
      max_limit: "100 per request",
      response_pagination: `{ pagination: { page, limit, total, totalPages, hasNext, hasPrev }, data: [...] }`,
    },
    fields: {
      hadith_object: `{ number: 1, arab: "teks arab...", id: "terjemahan indonesia..." }`,
      descriptions: [
        { field: "number", type: "number", desc: "Nomor hadis dalam kitab (1..6638 untuk Bukhari)" },
        { field: "arab", type: "string", desc: "Teks Arab lengkap dengan sanad" },
        { field: "id", type: "string", desc: "Terjemahan Indonesia lengkap" },
        { field: "book", type: "string", desc: "ID kitab, hanya ada di endpoint search/random" },
      ],
    },
    errors: [
      { code: 404, contoh: `GET ${baseUrl}/books/unknown`, response: `{ error: "Kitab tidak ditemukan" }` },
      { code: 404, contoh: `GET ${baseUrl}/books/bukhari/99999`, response: `{ error: "Hadis no 99999 tidak ditemukan" }` },
      { code: 400, contoh: `GET ${baseUrl}/books/bukhari/search (tanpa q)`, response: `{ error: "query param 'q' minimal 2 karakter" }` },
      { code: 400, contoh: `GET ${baseUrl}/books/bukhari?range=abc`, response: `{ error: "format range salah" }` },
    ],
    code_examples: {
      curl: `curl ${baseUrl}/books/bukhari/1\ncurl ${baseUrl}/books/muslim?page=1&limit=5\ncurl "${baseUrl}/books/bukhari/search?q=wudhu&limit=2"`,
      javascript: `// Browser / Node / React\nfetch('${baseUrl}/books/bukhari/1')\n  .then(r=>r.json()).then(console.log)\n\n// Pagination full kitab\nlet page=1; while(true){\n  const r=await fetch('${baseUrl}/books/bukhari?page='+page+'&limit=100');\n  const j=await r.json();\n  console.log(j.data);\n  if(!j.pagination.hasNext) break;\n  page++;\n}`,
      python: `import requests\nr = requests.get('${baseUrl}/books/muslim/1')\nprint(r.json())\n\n# search\nr = requests.get('${baseUrl}/search', params={'q':'puasa','limit':5})\nprint(r.json()['data'])`,
    },
    usage_notes: [
      "Full kitab dikembalikan dengan pagination (default 20) untuk menghindari limit 5MB Vercel. Gunakan ?page & ?limit atau ?range untuk ambil semua (loop page 1..N).",
      "Semua response JSON dengan format { data, pagination, ... }.",
      "CORS enabled - bisa dipanggil dari frontend mana saja.",
      "Data Arab & Indonesia tersedia di field 'arab' dan 'id'.",
      "Tidak perlu API key, gratis, rate limit wajar Vercel.",
    ],
    credits: {
      author: "Hanif Abdurrohim",
      github: "https://github.com/dextryayers",
      data_source: "9 file JSON lokal (Kutubut Tis'ah)",
    },
    deployed_on: "Vercel - https://api-hadith.vercel.app",
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
<title>API Hadis - By Hanif Abdurrohim</title>
<style>
  *{box-sizing:border-box} body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif; max-width:960px; margin:0 auto; padding:24px; line-height:1.7; color:#1c1917; background:#fafaf9}
  header{border-bottom:3px solid #0f766e; padding-bottom:16px; margin-bottom:24px}
  h1{margin:0; color:#0f766e; font-size:28px} h2{color:#0f766e; margin-top:36px; border-left:4px solid #0f766e; padding-left:12px; font-size:20px} h3{margin:18px 0 8px; color:#134e4a}
  .by{color:#57534e; margin:6px 0 0} .badge{display:inline-block; background:#0f766e; color:white; padding:3px 10px; border-radius:999px; font-size:12px; margin-right:6px}
  table{width:100%; border-collapse:collapse; margin:12px 0; font-size:14px} th,td{border:1px solid #e7e5e4; padding:8px 10px; text-align:left} th{background:#f0fdfa}
  .endpoint{background:white; border:1px solid #e7e5e4; border-left:4px solid #0f766e; padding:14px 16px; margin:14px 0; border-radius:10px}
  .method{background:#0f766e; color:white; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold}
  code{background:#f0fdfa; padding:2px 6px; border-radius:4px; font-size:13px} a{color:#0f766e} a:hover{opacity:0.8}
  pre code{background:transparent !important; color:#e7fffe !important; padding:0; border:none; font-size:13px; line-height:1.7}
  pre{color:#e7fffe; border:1px solid #1e293b; background:#1c1917; padding:16px; border-radius:10px; overflow:auto; margin:10px 0}
  footer{margin-top:48px; padding-top:16px; border-top:1px solid #e7e5e4; text-align:center; color:#57534e; font-size:14px}
  .notes li{margin:6px 0} .callout{background:#ecfdf5; border:1px solid #a7f3d0; padding:12px 16px; border-radius:8px; margin:12px 0}
  .warn{background:#fef3c7; border:1px solid #fcd34d; padding:12px 16px; border-radius:8px; margin:12px 0}
  .grid{display:grid; grid-template-columns:1fr 1fr; gap:12px} @media(max-width:640px){.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<header>
  <h1>📚 API Hadis - 10 Kitab Utama</h1>
  <p class="by">By - <strong>Hanif Abdurrohim</strong> • v1.0.0 • ${payload.total_hadith.toLocaleString("id-ID")} hadis & bab • 10 kitab (9 + Riyadhus) • <a href="https://github.com/dextryayers" target="_blank">github.com/dextryayers</a></p>
  <p>${payload.description}</p>
  <div><span class="badge">REST</span><span class="badge">JSON</span><span class="badge">CORS</span><span class="badge">No API Key</span><span class="badge">Vercel Ready</span></div>
</header>

<div class="callout">
  <strong>🔰 Untuk Pemula - Apa itu API ini?</strong><br>
  API ini adalah jembatan: kamu kirim request via URL, server balikin data hadis dalam format JSON. Tidak perlu database, tidak perlu login. Cukup <code>fetch()</code> atau <code>curl</code> langsung dapat data. Semua endpoint pakai <code>GET</code> (ambil data), gratis, dan bisa dipakai di website, aplikasi Android/iOS, bot Telegram, dll.
</div>

<h2>⚡ Quick Start - 3 Langkah Langsung Jalan</h2>
<ol>
  <li><b>Lihat daftar kitab:</b> <a href="${baseUrl}/books" target="_blank">${baseUrl}/books</a> → dapat 10 ID kitab (9 + Riyadhus)</li>
  <li><b>Ambil 1 hadis:</b> <a href="${baseUrl}/books/bukhari/1" target="_blank">${baseUrl}/books/bukhari/1</a> → hadis Bukhari no 1</li>
  <li><b>Cari hadis:</b> <a href="${baseUrl}/books/bukhari/search?q=wudhu" target="_blank">${baseUrl}/books/bukhari/search?q=wudhu</a> → cari kata "wudhu"</li>
</ol>
<div class="callout" style="background:white">
  <b>Tidak perlu API key!</b> CORS sudah aktif, jadi bisa langsung <code>fetch</code> dari React, Vue, Next.js, Flutter, dll.<br>
  <b>Base URL Production:</b> <code>${baseUrl}</code> • <b>Lokal:</b> <code>http://localhost:3000</code>
</div>

<h2>📖 Daftar Kitab (10 Kitab: 9 Kutubut Tis'ah + Riyadhus Shalihin)</h2>
<table>
  <tr><th>ID (pakai ini)</th><th>Nama Kitab</th><th>Jumlah</th><th>Coba Klik</th></tr>
  ${booksHtml}
  <tr style="font-weight:bold; background:#f0fdfa"><td colspan="2">Total</td><td>${payload.total_hadith}</td><td>38.102 hadis</td></tr>
</table>
<p><small>Gunakan <code>id</code> persis seperti di tabel (huruf kecil, pakai strip: <code>abu-daud</code>, <code>ibnu-majah</code>).</small></p>

<h2>🔗 Daftar Endpoint Lengkap</h2>
<p>Semua endpoint pakai method <code>GET</code>. Klik contoh untuk coba langsung.</p>
${endpointsHtml}

<h2>📄 Penjelasan Range & Pagination (PENTING - WAJIB PAHAM)</h2>
<div class="warn">
  <b>Kenapa tidak bisa <code>/books/bukhari</code> langsung full 6638?</b><br>
  Karena Vercel limit response ~5MB. 1 kitab Bukhari full = ~12MB, kalau dipaksa kirim akan error/timeout. Solusi: pakai halaman (pagination).
</div>
<h3>Cara 1: Pagination (disarankan)</h3>
<pre><code>${(payload.pagination_guide as any).contoh.join("\n")}</code></pre>
<p>Response akan ada:</p>
<pre><code>{
  "book": "bukhari",
  "pagination": { "page": 1, "limit": 20, "total": 6638, "totalPages": 332, "hasNext": true, "hasPrev": false },
  "data": [ ... 20 hadis ... ]
}</code></pre>
<p><b>max limit 100</b> per request. Untuk full, loop <code>page=1..totalPages</code> sampai <code>hasNext=false</code>.</p>

<h3>Cara 2: Range (ambil nomor tertentu)</h3>
<pre><code>${baseUrl}/books/bukhari?range=1-10    → hadis no 1 sampai 10
${baseUrl}/books/bukhari?range=1,10   → sama (koma atau strip)
${baseUrl}/books/muslim?range=100-120 → no 100-120</code></pre>

<h2>🧩 Struktur Data Hadis (Field)</h2>
<p>Setiap hadis object seperti ini:</p>
<pre><code>{
  "number": 1,
  "arab": "حَدَّثَنَا الْحُمَيْدِيُّ ... (teks Arab + sanad)",
  "id": "Telah menceritakan kepada kami [Al Humaidi] ... (terjemahan Indonesia)"
}</code></pre>
<table>
  <tr><th>Field</th><th>Tipe</th><th>Arti</th></tr>
  ${(payload.fields as any).descriptions.map((f: any) => `<tr><td><code>${f.field}</code></td><td>${f.type}</td><td>${f.desc}</td></tr>`).join("")}
</table>
<p><small>Endpoint <code>/search</code> dan <code>/random</code> menambah field <code>book</code> untuk tahu asal kitab.</small></p>

<h2>❗ Error Handling (Biar Tidak Bingung)</h2>
<table>
  <tr><th>HTTP</th><th>Contoh Request</th><th>Response</th></tr>
  ${(payload.errors as any[]).map((e: any) => `<tr><td>${e.code}</td><td><code>${e.contoh}</code></td><td><code>${e.response}</code></td></tr>`).join("")}
</table>
<p>Semua error format: <code>{ "error": "pesan..." }</code>. Kalau <code>book</code> salah, cek daftar ID di tabel kitab.</p>

<h2>💻 Contoh Kode Lengkap (Copy-Paste Langsung Jalan)</h2>
<h3>cURL (Terminal)</h3>
<pre><code>${(payload.code_examples as any).curl}</code></pre>

<h3>JavaScript / React / Next.js</h3>
<pre><code>${(payload.code_examples as any).javascript.replace(/</g, "&lt;")}</code></pre>

<h3>Python</h3>
<pre><code>${(payload.code_examples as any).python}</code></pre>

<div class="grid">
  <div class="callout">
    <b>⚡ Tips Frontend</b><br>
    • Pakai <code>?limit=20</code> untuk list awal, lalu infinite scroll pakai <code>page++</code><br>
    • Cari pakai debounce 300ms ke <code>/search?q=...</code><br>
    • Cache hasil di localStorage 1 jam untuk hemat request
  </div>
  <div class="warn">
    <b>🚀 Deploy</b><br>
    Sudah siap Vercel: <code>vercel --prod</code> → nama project <code>api-hadith</code><br>
    File data <code>data/*.json</code> otomatis include via <code>vercel.json</code>
  </div>
</div>

<h2>📝 Catatan Penggunaan</h2>
<ul class="notes">
  ${(payload.usage_notes as any[]).map((n: string) => `<li>${n}</li>`).join("")}
</ul>

<h2>💡 Contoh Cepat (Lengkap)</h2>
<pre><code>curl ${baseUrl}/books/bukhari/1
curl ${baseUrl}/books/muslim?page=1&limit=5
curl "${baseUrl}/books/bukhari/search?q=wudhu&limit=2"
curl ${baseUrl}/search?q=niat
curl ${baseUrl}/random?book=tirmidzi
fetch('${baseUrl}/books/bukhari?range=1-10').then(r=>r.json()).then(console.log)</code></pre>

<div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap">
  <h2 style="margin:0; border:none; padding:0">🧪 Live API Tester</h2>
  <span style="background:#0f766e; color:white; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:bold">● LIVE</span>
  <span style="background:#1c1917; color:#a7f3d0; padding:4px 10px; border-radius:999px; font-size:12px; font-family:monospace">https://api-hadith.vercel.app</span>
  <span style="background:#fef3c7; color:#92400e; padding:4px 10px; border-radius:999px; font-size:12px">1 tester untuk 8 route</span>
</div>
<p style="margin:8px 0 0; color:#57534e">Pilih endpoint → isi parameter → klik <b>GET</b>. Hasil <b>real JSON</b> langsung dari server (CORS aktif). Bisa untuk semua route tanpa Postman.</p>

<div class="endpoint" style="margin:16px 0; padding:20px; background:white; border:1px solid #e7e5e4; border-radius:14px; box-shadow:0 4px 16px rgba(15,118,110,0.08)">
  <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:end">
    <div style="flex:1; min-width:220px">
      <label style="font-size:12px; font-weight:bold; color:#0f766e">Pilih Endpoint</label>
      <select id="u-endpoint" onchange="onEndpointChange()" style="width:100%; padding:10px; border:1px solid #e7e5e4; border-radius:8px; margin-top:4px">
        <option value="/">GET / → Info & Docs</option>
        <option value="/books">GET /books → List 9 kitab</option>
        <option value="/books/{id}" selected>GET /books/{id} → Full kitab + pagination</option>
        <option value="/books/{id}/{number}">GET /books/{id}/{number} → Detail 1 hadis</option>
        <option value="/books/{id}/search">GET /books/{id}/search?q= → Search per kitab</option>
        <option value="/search">GET /search?q= → Search semua kitab</option>
        <option value="/books/{id}/random">GET /books/{id}/random → Random per kitab</option>
        <option value="/random">GET /random → Random 9 kitab</option>
        <option value="custom">✏️ Custom URL (manual)</option>
      </select>
    </div>
    <div id="u-book-wrap" style="min-width:160px">
      <label style="font-size:12px; font-weight:bold; color:#0f766e">Kitab (id)</label>
      <select id="u-book" style="width:100%; padding:10px; border:1px solid #e7e5e4; border-radius:8px; margin-top:4px">
        <option value="bukhari">bukhari (6638)</option><option value="muslim">muslim (4930)</option><option value="abu-daud">abu-daud (4419)</option><option value="tirmidzi">tirmidzi (3625)</option><option value="nasai">nasai (5364)</option><option value="ibnu-majah">ibnu-majah (4285)</option><option value="ahmad">ahmad (4305)</option><option value="darimi">darimi (2949)</option><option value="malik">malik (1587)</option><option value="riyadush-shalihin">riyadush-shalihin (372 bab)</option>
      </select>
    </div>
    <div id="u-num-wrap" style="display:none; min-width:110px">
      <label style="font-size:12px; font-weight:bold; color:#0f766e">Number</label>
      <input id="u-num" type="number" value="1" min="1" style="width:100%; padding:10px; border:1px solid #e7e5e4; border-radius:8px; margin-top:4px" placeholder="1">
    </div>
    <div id="u-q-wrap" style="display:none; min-width:180px">
      <label style="font-size:12px; font-weight:bold; color:#0f766e">Query q</label>
      <input id="u-q" value="wudhu" style="width:100%; padding:10px; border:1px solid #e7e5e4; border-radius:8px; margin-top:4px" placeholder="min 2 huruf">
    </div>
  </div>

  <!-- quick chips -->
  <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:12px">
    <small style="color:#57534e; align-self:center; font-weight:bold">⚡ Cepat:</small>
    <button onclick="quick('b1')" style="background:#f0fdfa; border:1px solid #99f6e4; padding:5px 10px; border-radius:999px; cursor:pointer; font-size:12px">Bukhari #1</button>
    <button onclick="quick('bPage')" style="background:#f0fdfa; border:1px solid #99f6e4; padding:5px 10px; border-radius:999px; cursor:pointer; font-size:12px">Bukhari p1/limit5</button>
    <button onclick="quick('m500')" style="background:#f0fdfa; border:1px solid #99f6e4; padding:5px 10px; border-radius:999px; cursor:pointer; font-size:12px">Muslim #500</button>
    <button onclick="quick('searchWudhu')" style="background:#fef3c7; border:1px solid #fcd34d; padding:5px 10px; border-radius:999px; cursor:pointer; font-size:12px">Search wudhu</button>
    <button onclick="quick('searchPuasa')" style="background:#fef3c7; border:1px solid #fcd34d; padding:5px 10px; border-radius:999px; cursor:pointer; font-size:12px">Search puasa (all)</button>
    <button onclick="quick('riyadush1')" style="background:#ede9fe; border:1px solid #c4b5fd; padding:5px 10px; border-radius:999px; cursor:pointer; font-size:12px">Riyadush Bab 1</button>
    <button onclick="quick('random')" style="background:#ecfdf5; border:1px solid #a7f3d0; padding:5px 10px; border-radius:999px; cursor:pointer; font-size:12px">🎲 Random</button>
  </div>

  <!-- baris 2: pagination / custom -->
  <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; align-items:end">
    <div id="u-page-wrap" style="flex:1; min-width:120px">
      <label style="font-size:12px; font-weight:bold; color:#57534e">page</label>
      <input id="u-page" type="number" value="1" min="1" style="width:100%; padding:8px; border:1px solid #e7e5e4; border-radius:6px; margin-top:4px" placeholder="1">
    </div>
    <div id="u-limit-wrap" style="flex:1; min-width:120px">
      <label style="font-size:12px; font-weight:bold; color:#57534e">limit (max 100)</label>
      <input id="u-limit" type="number" value="5" min="1" max="100" style="width:100%; padding:8px; border:1px solid #e7e5e4; border-radius:6px; margin-top:4px" placeholder="20">
    </div>
    <div id="u-range-wrap" style="flex:1; min-width:160px">
      <label style="font-size:12px; font-weight:bold; color:#57534e">range (opsional)</label>
      <input id="u-range" placeholder="contoh: 1-10" style="width:100%; padding:8px; border:1px solid #e7e5e4; border-radius:6px; margin-top:4px">
    </div>
    <div id="u-custom-wrap" style="display:none; flex:2; min-width:240px">
      <label style="font-size:12px; font-weight:bold; color:#0f766e">Custom Path</label>
      <input id="u-custom" value="/books/bukhari/1" style="width:100%; padding:10px; border:1px solid #e7e5e4; border-radius:8px; margin-top:4px; font-family:monospace" placeholder="/books/bukhari/1">
    </div>
    <button onclick="testUniversal()" style="background:#0f766e; color:white; border:none; padding:11px 18px; border-radius:8px; cursor:pointer; font-weight:bold; white-space:nowrap">GET →</button>
  </div>

  <div style="margin-top:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px; display:flex; gap:8px; flex-wrap:wrap; align-items:center">
    <span style="font-size:11px; font-weight:bold; color:#0f766e; background:white; border:1px solid #99f6e4; padding:3px 8px; border-radius:6px">GET</span>
    <code id="u-preview" style="flex:1; word-break:break-all; background:transparent; border:none; padding:0; font-size:13px; color:#0f172a">${baseUrl}/books/bukhari?page=1&limit=5</code>
    <button onclick="copyUrl()" style="background:white; border:1px solid #cbd5e1; padding:6px 12px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600">📋 Copy</button>
    <a id="u-open" href="${baseUrl}/books/bukhari?page=1&limit=5" target="_blank" style="font-size:12px; background:#0f766e; color:white; padding:6px 12px; border-radius:8px; text-decoration:none; font-weight:600">↗ Buka</a>
  </div>

  <div style="display:flex; gap:8px; margin-top:12px; align-items:center; flex-wrap:wrap">
    <div id="u-status" style="font-size:12px; color:#57534e; background:#f1f5f9; padding:6px 10px; border-radius:999px; border:1px solid #e2e8f0">● Siap — klik GET</div>
    <div style="margin-left:auto; display:flex; gap:6px">
      <button onclick="switchTab('json')" id="tab-json" style="background:#0f766e; color:white; border:none; padding:6px 12px; border-radius:999px; cursor:pointer; font-size:12px; font-weight:bold">Raw JSON</button>
      <button onclick="switchTab('hadis')" id="tab-hadis" style="background:white; border:1px solid #cbd5e1; padding:6px 12px; border-radius:999px; cursor:pointer; font-size:12px">Hadis View</button>
      <button onclick="copyJson()" style="background:white; border:1px solid #cbd5e1; padding:6px 12px; border-radius:999px; cursor:pointer; font-size:12px">📋 Copy JSON</button>
    </div>
  </div>

  <div id="u-out-json" style="background:#0f172a; color:#e2e8f0; padding:16px; border-radius:10px; font-size:12px; min-height:160px; overflow:auto; max-height:480px; white-space:pre-wrap; word-break:break-word; margin-top:8px; border:1px solid #1e293b; font-family:ui-monospace, SFMono-Regular, Menlo, monospace; line-height:1.6">Klik "GET →" untuk coba. Tester ini support semua 8 endpoint — ganti dropdown di atas.</div>
  <div id="u-out-hadis" style="display:none; background:white; border:1px solid #e7e5e4; border-radius:10px; padding:16px; margin-top:8px; max-height:520px; overflow:auto">
    <div style="text-align:center; color:#57534e; padding:20px">Pilih endpoint & klik GET untuk lihat hadis dalam format cantik (Arab + Indonesia)</div>
  </div>
</div>

<div class="callout">
  <b>Cara pakai 1 tester ini:</b> 1) Pilih endpoint di dropdown → 2) Isi <code>kitab / number / q</code> yang muncul → 3) Klik <b>GET →</b>. Untuk bebas, pilih <b>Custom URL</b> lalu ketik path apa saja (misal <code>/books/muslim?range=10-12</code>).
</div>

<script>
const API = "https://api-hadith.vercel.app";
let lastJson = null;
let lastStatus = 0;
function onEndpointChange(){
  const ep = document.getElementById('u-endpoint').value;
  const show = (id, yes)=> document.getElementById(id).style.display = yes ? '' : 'none';
  const needBook = ["/books/{id}", "/books/{id}/{number}", "/books/{id}/search", "/books/{id}/random"].includes(ep);
  const needNum = ep === "/books/{id}/{number}";
  const needQ = ep === "/books/{id}/search" || ep === "/search";
  const needPage = ep === "/books/{id}" || ep === "/books/{id}/search" || ep === "/search";
  const isCustom = ep === "custom";
  const isBooksId = ep === "/books/{id}";
  show('u-book-wrap', needBook && !isCustom);
  show('u-num-wrap', needNum);
  show('u-q-wrap', needQ);
  show('u-page-wrap', needPage && !isCustom);
  show('u-limit-wrap', needPage && !isCustom);
  show('u-range-wrap', isBooksId);
  show('u-custom-wrap', isCustom);
  updatePreview();
}
function buildUrl(){
  const ep = document.getElementById('u-endpoint').value;
  const book = document.getElementById('u-book').value;
  const num = document.getElementById('u-num').value || '1';
  const q = document.getElementById('u-q').value.trim();
  const page = document.getElementById('u-page').value || '1';
  const limit = document.getElementById('u-limit').value || '20';
  const range = document.getElementById('u-range').value.trim();
  const custom = document.getElementById('u-custom').value.trim();
  if(ep === "custom"){
    let p = custom || "/books/bukhari/1";
    if(!p.startsWith("/")) p = "/" + p;
    return API + p;
  }
  if(ep === "/") return API + "/";
  if(ep === "/books") return API + "/books";
  if(ep === "/books/{id}"){
    let u = API + "/books/" + book;
    if(range) return u + "?range=" + encodeURIComponent(range);
    return u + "?page=" + encodeURIComponent(page) + "&limit=" + encodeURIComponent(limit);
  }
  if(ep === "/books/{id}/{number}") return API + "/books/" + book + "/" + encodeURIComponent(num);
  if(ep === "/books/{id}/search"){
    let u = API + "/books/" + book + "/search?q=" + encodeURIComponent(q || 'wudhu');
    if(page) u += "&page=" + encodeURIComponent(page);
    if(limit) u += "&limit=" + encodeURIComponent(limit);
    return u;
  }
  if(ep === "/search"){
    let u = API + "/search?q=" + encodeURIComponent(q || 'wudhu');
    if(limit) u += "&limit=" + encodeURIComponent(limit);
    return u;
  }
  if(ep === "/books/{id}/random") return API + "/books/" + book + "/random";
  if(ep === "/random"){
    return book ? API + "/random?book=" + encodeURIComponent(book) : API + "/random";
  }
  return API + "/";
}
function updatePreview(){
  const url = buildUrl();
  document.getElementById('u-preview').textContent = url;
  document.getElementById('u-open').href = url;
}
['u-endpoint','u-book','u-num','u-q','u-page','u-limit','u-range','u-custom'].forEach(id=>{
  const el=document.getElementById(id);
  if(el) el.addEventListener('input', updatePreview);
  if(el) el.addEventListener('change', updatePreview);
  if(el) el.addEventListener('keydown', (e)=>{ if(e.key==='Enter') testUniversal(); });
});
function quick(type){
  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.value=v; };
  if(type==='b1'){ set('u-endpoint','/books/{id}/{number}'); set('u-book','bukhari'); set('u-num','1'); }
  if(type==='bPage'){ set('u-endpoint','/books/{id}'); set('u-book','bukhari'); set('u-page','1'); set('u-limit','5'); set('u-range',''); }
  if(type==='m500'){ set('u-endpoint','/books/{id}/{number}'); set('u-book','muslim'); set('u-num','500'); }
  if(type==='searchWudhu'){ set('u-endpoint','/books/{id}/search'); set('u-book','bukhari'); set('u-q','wudhu'); }
  if(type==='searchPuasa'){ set('u-endpoint','/search'); set('u-q','puasa'); set('u-limit','5'); }
  if(type==='riyadush1'){ set('u-endpoint','/books/{id}/{number}'); set('u-book','riyadush-shalihin'); set('u-num','1'); }
  if(type==='random'){ set('u-endpoint','/books/{id}/random'); set('u-book','bukhari'); }
  onEndpointChange(); updatePreview(); testUniversal();
}
function switchTab(tab){
  const jsonBtn=document.getElementById('tab-json');
  const hadisBtn=document.getElementById('tab-hadis');
  const jsonEl=document.getElementById('u-out-json');
  const hadisEl=document.getElementById('u-out-hadis');
  if(tab==='json'){
    jsonBtn.style.background='#0f766e'; jsonBtn.style.color='white'; jsonBtn.style.border='none';
    hadisBtn.style.background='white'; hadisBtn.style.color='#1c1917'; hadisBtn.style.border='1px solid #cbd5e1';
    jsonEl.style.display=''; hadisEl.style.display='none';
  } else {
    hadisBtn.style.background='#0f766e'; hadisBtn.style.color='white'; hadisBtn.style.border='none';
    jsonBtn.style.background='white'; jsonBtn.style.color='#1c1917'; jsonBtn.style.border='1px solid #cbd5e1';
    jsonEl.style.display='none'; hadisEl.style.display='';
  }
}
function copyUrl(){
  const url = document.getElementById('u-preview').textContent;
  navigator.clipboard.writeText(url).then(()=>{ const b=document.getElementById('u-preview'); const t=b.textContent; b.textContent='✅ Copied! ' + t; setTimeout(()=>b.textContent=url,1200); });
}
function copyJson(){
  if(!lastJson) return;
  const pretty = JSON.stringify(lastJson, null, 2);
  navigator.clipboard.writeText(pretty).then(()=>{
    const btn=document.querySelector('button[onclick=\"copyJson()\"]');
    const old=btn.textContent; btn.textContent='✅ Copied!'; setTimeout(()=>btn.textContent=old,1200);
  });
}
function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function renderHadisView(data){
  const el=document.getElementById('u-out-hadis');
  try{
    if(data.error){
      el.innerHTML = '<div style=\"color:#dc2626; background:#fef2f2; border:1px solid #fecaca; padding:12px; border-radius:8px\">❌ ' + escapeHtml(data.error) + '</div>';
      return;
    }
    // single hadis: {book, data:{number,arab,id}} -> TAMPIL FULL TANPA POTONG
    if(data.data && data.data.arab && !Array.isArray(data.data)){
      const h=data.data;
      const book=data.book?'<span style=\"background:#0f766e;color:white;padding:2px 8px;border-radius:999px;font-size:11px\">'+escapeHtml(data.book)+'</span>':'';
      el.innerHTML = '<div style=\"border:1px solid #e7e5e4; border-radius:10px; padding:16px; background:white\">' +
        '<div style=\"display:flex; justify-content:space-between; align-items:center; margin-bottom:10px\"><b>Hadis #' + h.number + '</b> ' + book + ' <small style=\"color:#57534e\">full</small></div>' +
        '<div style=\"background:#f0fdfa; padding:14px; border-radius:8px; text-align:right; font-family:serif; line-height:2; direction:rtl; font-size:16px; border:1px solid #ccfbf1\">' + escapeHtml(h.arab) + '</div>' +
        '<div style=\"margin-top:12px; line-height:1.8; background:#fafaf9; padding:14px; border-radius:8px; border-left:4px solid #0f766e; font-size:14px\">' + escapeHtml(h.id) + '</div>' +
        '</div>';
      return;
    }
    // list: {data:[...]} -> tampil full per item (tidak dipotong 400), tapi tetap batasi 5 preview agar tidak lag, klik JSON untuk full
    const list = Array.isArray(data.data) ? data.data : (data.data ? [data.data] : []);
    if(list.length && list[0] && list[0].arab){
      // jika list pendek (<=5) tampil FULL tanpa potong
      const isShort = list.length <= 5;
      el.innerHTML = list.slice(0, isShort ? list.length : 5).map(h=> 
        '<div style=\"border:1px solid #e7e5e4; border-radius:10px; padding:14px; margin-bottom:12px; background:white\">' +
        '<div style=\"display:flex; justify-content:space-between; margin-bottom:8px\"><b>#' + h.number + '</b><small style=\"color:#57534e\">' + (data.book?escapeHtml(data.book):'') + '</small></div>' +
        '<div style=\"background:#f0fdfa; padding:12px; border-radius:8px; text-align:right; direction:rtl; font-family:serif; line-height:1.9; font-size:14px; border:1px solid #ccfbf1\">' + escapeHtml(isShort ? h.arab : (h.arab||'').slice(0,600) + (h.arab&&h.arab.length>600?'...':'')) + '</div>' +
        '<div style=\"margin-top:10px; font-size:13px; line-height:1.7; background:#fafaf9; padding:10px; border-radius:6px\">' + escapeHtml(isShort ? h.id : (h.id||'').slice(0,500) + (h.id&&h.id.length>500?'...':'')) + '</div>' +
        '</div>'
      ).join('') + (list.length>5 ? '<div style=\"text-align:center; color:#57534e; font-size:12px; background:#f8fafc; padding:8px; border-radius:8px; border:1px dashed #cbd5e1\">+' + (list.length-5) + ' lagi — buka tab Raw JSON atau pakai <code>?range=</code> untuk lihat full</div>' : '<div style=\"text-align:center; color:#0f766e; font-size:12px; margin-top:8px\">✅ Full tampil tanpa potong</div>');
      return;
    }
    // fallback for /books list etc
    el.innerHTML = '<div style=\"color:#57534e; padding:12px\">Lihat tab <b>Raw JSON</b> untuk struktur lengkap. Hadis View otomatis aktif untuk response yang berisi field <code>arab</code> & <code>id</code>.</div>';
  } catch(e){
    el.innerHTML = '<div style=\"color:#dc2626\">Gagal render: ' + escapeHtml(e.message) + '</div>';
  }
}
function setOut(data, url, ms, status){
  lastJson = data;
  lastStatus = status;
  const jsonEl = document.getElementById('u-out-json');
  const pretty = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  // untuk single hadis, tampil FULL tanpa potong (biasa 3-8k). Untuk list, tampil full juga sampai 50k biar tidak kepotong
  const isSingle = data && data.data && data.data.arab && !Array.isArray(data.data);
  const limit = isSingle ? 500000 : 50000;
  const sliced = pretty.length > limit ? pretty.slice(0,limit) + "\\n... (terpotong " + (pretty.length-limit) + " char — buka di tab/browser untuk full: " + url + ")" : pretty;
  jsonEl.textContent = "➜ " + url + " [" + status + "] (" + ms + "ms, " + new Blob([pretty]).size + " bytes)\\n" + sliced;
  // status badge
  const statusEl=document.getElementById('u-status');
  const ok = status>=200 && status<300;
  statusEl.textContent = (ok?'● ':'○ ') + status + ' ' + (ok?'OK':'Error') + ' • ' + ms + 'ms • ' + new Blob([pretty]).size + ' bytes' + (isSingle ? ' • full' : '');
  statusEl.style.background = ok ? '#ecfdf5' : '#fef2f2';
  statusEl.style.color = ok ? '#065f46' : '#991b1b';
  statusEl.style.borderColor = ok ? '#a7f3d0' : '#fecaca';
  renderHadisView(data);
}
async function testUniversal(){
  const url = buildUrl();
  const jsonEl = document.getElementById('u-out-json');
  const statusEl=document.getElementById('u-status');
  jsonEl.textContent = "⏳ Loading " + url + " ...";
  document.getElementById('u-out-hadis').innerHTML = '<div style=\"text-align:center; color:#57534e; padding:20px\">⏳ Memuat...</div>';
  statusEl.textContent = '⏳ Loading...';
  statusEl.style.background='#fef3c7'; statusEl.style.color='#92400e'; statusEl.style.borderColor='#fcd34d';
  const t0 = performance.now();
  try{
    const r = await fetch(url);
    const ms = Math.round(performance.now()-t0);
    const j = await r.json();
    setOut(j, url, ms, r.status);
  }catch(e){
    jsonEl.textContent = "❌ Error: " + e.message + "\\nURL: " + url;
    document.getElementById('u-out-hadis').innerHTML = '<div style=\"color:#dc2626; background:#fef2f2; padding:12px; border-radius:8px\">❌ ' + escapeHtml(e.message) + '</div>';
    statusEl.textContent='❌ Error'; statusEl.style.background='#fef2f2'; statusEl.style.color='#991b1b';
  }
}
window.addEventListener('load', ()=>{ onEndpointChange(); setTimeout(testUniversal, 700); });
</script>

<footer>
  <p>© ${new Date().getFullYear()} By - <strong>Hanif Abdurrohim</strong> • Built with Hono + TypeScript • Deployed on Vercel • <a href="https://github.com/dextryayers" target="_blank">GitHub @dextryayers</a></p>
  <p><small>Data: 9 JSON Kutubut Tis'ah (38.102 hadis) | Field: <code>arab</code> & <code>id</code> | Gratis, No API Key, CORS Enabled</small></p>
  <p><a href="${baseUrl}/books" target="_blank">Lihat /books (JSON)</a> • <a href="${baseUrl}/books/bukhari/1" target="_blank">Contoh Hadis</a> • <a href="https://github.com/dextryayers" target="_blank">GitHub</a></p>
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
  const bookParamRaw = c.req.query("book");
  const bookParam = bookParamRaw ? normalizeBookId(bookParamRaw) : undefined;
  const bookId = bookParam && BOOKS[bookParam] ? bookParam : BOOK_IDS[Math.floor(Math.random() * BOOK_IDS.length)];
  const data = getBookData(bookId);
  const random = data[Math.floor(Math.random() * data.length)];
  return c.json({ book: bookId, data: random });
});

// --- Per-book routes ---

// GET /books/:book  -> full or paginated
app.get("/books/:book", (c) => {
  const bookIdRaw = c.req.param("book");
  const bookId = normalizeBookId(bookIdRaw);
  const book = BOOKS[bookId];
  if (!book) {
    return c.json({ error: `Kitab tidak ditemukan: ${bookIdRaw}`, available: BOOK_IDS }, 404);
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
  const bookIdRaw = c.req.param("book");
  const bookId = normalizeBookId(bookIdRaw);
  if (!BOOKS[bookId]) return c.json({ error: `Kitab tidak ditemukan: ${bookIdRaw}` }, 404);
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
  const bookIdRaw = c.req.param("book");
  const bookId = normalizeBookId(bookIdRaw);
  if (!BOOKS[bookId]) return c.json({ error: `Kitab tidak ditemukan: ${bookIdRaw}` }, 404);
  const data = getBookData(bookId);
  const random = data[Math.floor(Math.random() * data.length)];
  return c.json({ book: bookId, data: random });
});

// GET /books/:book/:number  -> single hadith
app.get("/books/:book/:number", (c) => {
  const bookIdRaw = c.req.param("book");
  const bookId = normalizeBookId(bookIdRaw);
  const numStr = c.req.param("number");
  if (!BOOKS[bookId]) return c.json({ error: `Kitab tidak ditemukan: ${bookIdRaw}` }, 404);
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
