import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { BOOKS, BOOK_IDS, normalizeBookId } from "./types.js";
import { getBookData, getHadithByNumber, searchBookData } from "./data.js";

const app = new Hono();

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET"],
  allowHeaders: ["Content-Type", "Accept"],
  maxAge: 86400,
  credentials: false,
}));
app.use("*", logger());

function cacheHeaders(maxAge: number, stale?: number): Record<string, string> {
  const parts = [`public`, `max-age=${maxAge}`];
  if (stale) parts.push(`stale-while-revalidate=${stale}`);
  return { "Cache-Control": parts.join(", ") };
}

// Root info - lengkap + By Hanif (HTML untuk browser, JSON untuk API)
app.get("/", (c) => {
  const baseUrl = "https://hadisbooks.vercel.app";
  const accept = c.req.header("accept") || "";
  const wantsHtml = accept.includes("text/html");

  const payload = {
    message: "API Hadis Indonesia dan Arab 11 Kitab Utama",
    description:
      "API REST gratis tanpa API key untuk 40.274 hadis dan bab dari 11 kitab. Sembilan Kutubut Tisah ditambah Riyadhus Shalihin dan Musnad Syafii. Tiap data punya teks Arab dan terjemah Indonesia. Cocok untuk web, mobile, dan bot.",
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
        description: "Menampilkan dokumentasi lengkap. Balas JSON jika Accept application/json, HTML jika browser.",
        params: "-",
        query: "-",
        examples: [`${baseUrl}/`],
        response: `{ message, description, by, version, base_url, total_hadith, available_books, endpoints }`,
      },
      {
        method: "GET",
        path: "/books",
        description: "Daftar semua kitab yang tersedia. Tiap item punya id, nama, nama Arab, jumlah, dan contoh endpoint.",
        params: "-",
        query: "-",
        examples: [`${baseUrl}/books`],
        response: `{ data: [{id, name, arabicName, available, endpoint}], total: 11 }`,
      },
      {
        method: "GET",
        path: "/books/{id}",
        description: "Ambil hadis per kitab. Default kirim 20 pertama dengan pagination. Bisa pakai page dan limit atau range untuk ambil blok nomor.",
        params: "id wajib. Pilihan: bukhari, muslim, abu-daud, tirmidzi, nasai, ibnu-majah, ahmad, darimi, malik, riyadush-shalihin, musnad-syafii. Alias riyadush-sholihin juga bisa.",
        query: "page angka mulai 1 default 1, limit 1 sampai 100 default 20, range format 1-10 atau 1,10 untuk ambil nomor hadis langsung",
        examples: [
          `${baseUrl}/books/bukhari`,
          `${baseUrl}/books/bukhari?page=1&limit=5`,
          `${baseUrl}/books/musnad-syafii?page=2&limit=10`,
          `${baseUrl}/books/bukhari?range=1-10`,
          `${baseUrl}/books/riyadush-shalihin?range=7-7`,
        ],
        response: `{ book, name, pagination: {page, limit, total, totalPages, hasNext, hasPrev}, data: [{number, arab, id}] }`,
      },
      {
        method: "GET",
        path: "/books/{id}/{number}",
        description: "Ambil satu hadis berdasar nomor. Nomor sesuai urutan kitab asli. Jika nomor tidak ada, balas 404.",
        params: "id wajib seperti di atas, number wajib angka. Contoh bukhari 1 sampai 6638, riyadush 1 sampai 372, musnad 1 sampai 1800",
        query: "-",
        examples: [`${baseUrl}/books/bukhari/1`, `${baseUrl}/books/musnad-syafii/1`, `${baseUrl}/books/riyadush-shalihin/7`],
        response: `{ book, data: {number, arab, id, html?} }`,
      },
      {
        method: "GET",
        path: "/books/{id}/search",
        description: "Cari hadis di satu kitab. Pencarian di terjemah Indonesia, tidak case sensitive, minimal 2 huruf.",
        params: "id wajib",
        query: "q wajib minimal 2 huruf, page default 1, limit default 20 max 100",
        examples: [`${baseUrl}/books/bukhari/search?q=wudhu`, `${baseUrl}/books/bukhari/search?q=wudhu&page=2&limit=5`, `${baseUrl}/books/musnad-syafii/search?q=puasa&limit=3`],
        response: `{ book, query, pagination: {page, limit, total, totalPages}, data: [...] }`,
      },
      {
        method: "GET",
        path: "/search",
        description: "Cari di semua 11 kitab sekaligus. Hasil campur dari semua kitab, urut sesuai kitab ditemukan.",
        params: "-",
        query: "q wajib minimal 2 huruf, limit default 20 max 50",
        examples: [`${baseUrl}/search?q=puasa&limit=10`, `${baseUrl}/search?q=shalat`],
        response: `{ query, total, data: [{book, number, arab, id}] }`,
      },
      {
        method: "GET",
        path: "/books/{id}/random",
        description: "Ambil satu hadis acak dari kitab yang dipilih. Cocok untuk fitur hadis harian per kitab.",
        params: "id wajib",
        query: "-",
        examples: [`${baseUrl}/books/bukhari/random`, `${baseUrl}/books/musnad-syafii/random`, `${baseUrl}/books/riyadush-shalihin/random`],
        response: `{ book, data: {number, arab, id} }`,
      },
      {
        method: "GET",
        path: "/random",
        description: "Ambil satu hadis acak dari 11 kitab. Bisa filter pakai query book untuk acak di kitab tertentu.",
        params: "-",
        query: "book opsional. Jika diisi, acak dari kitab itu. Jika kosong, acak dari 11 kitab.",
        examples: [`${baseUrl}/random`, `${baseUrl}/random?book=musnad-syafii`, `${baseUrl}/random?book=bukhari`],
        response: `{ book, data: {number, arab, id} }`,
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
    deployed_on: "Vercel - https://hadisbooks.vercel.app",
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
        (e, idx) => {
          const paramsList = e.params && e.params !== "-" ? e.params.split(",").map((s:string)=>s.trim()).filter(Boolean) : [];
          const queryList = e.query && e.query !== "-" ? e.query.split(",").map((s:string)=>s.trim()).filter(Boolean) : [];
          return `
        <div class="endpoint" id="ep-${idx}">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap">
            <span class="method">${e.method}</span>
            <code style="font-weight:700; font-size:13px">${e.path}</code>
            <span style="margin-left:auto; font-size:11px; color:var(--muted); background:var(--code); padding:4px 10px; border-radius:999px; border:1px solid var(--border)">Endpoint ${idx+1} dari 8</span>
          </div>
          <p style="margin:8px 0 12px; font-size:13px">${e.description}</p>
          <div class="ep-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:10px 0">
            <div style="background:#f8fafc; border:1px solid var(--border); border-radius:10px; padding:10px">
              <div style="font-size:11px; font-weight:800; color:var(--teal); margin-bottom:6px">Path Params</div>
              ${paramsList.length ? `<ul style="margin:0; padding-left:16px; font-size:12px; line-height:1.6">${paramsList.map((p:string)=>`<li><code>${p.split(" ")[0]}</code> ${p.slice(p.indexOf(" ")+1)}</li>`).join("")}</ul>` : `<div style="font-size:12px; color:var(--muted)">Tidak ada params, akses langsung</div>`}
            </div>
            <div style="background:#f8fafc; border:1px solid var(--border); border-radius:10px; padding:10px">
              <div style="font-size:11px; font-weight:800; color:var(--teal); margin-bottom:6px">Query String</div>
              ${queryList.length ? `<ul style="margin:0; padding-left:16px; font-size:12px; line-height:1.6">${queryList.map((q:string)=>`<li><code>${q.split(" ")[0]}</code> ${q.slice(q.indexOf(" ")+1)}</li>`).join("")}</ul>` : `<div style="font-size:12px; color:var(--muted)">Tidak ada query</div>`}
            </div>
          </div>
          ${e.response ? `<div style="margin:10px 0"><div style="font-size:11px; font-weight:800; color:var(--teal); margin-bottom:6px">Contoh response</div><pre style="margin:0; font-size:11px"><code>${e.response}</code></pre></div>` : ""}
          <div style="margin-top:12px">
            <div style="font-size:11px; font-weight:800; color:var(--slate); margin-bottom:6px">Contoh request per poin</div>
            <div style="display:flex; gap:6px; flex-wrap:wrap">
              ${(e.examples || (e.example ? [e.example] : [])).map((ex: string) => `<a href="${ex}" target="_blank" style="font-size:11px; background:white; border:1px solid var(--border); padding:6px 12px; border-radius:999px; text-decoration:none; white-space:nowrap; max-width:100%; overflow:hidden; text-overflow:ellipsis">GET ${ex.replace(baseUrl, "")}</a>`).join("")}
            </div>
            <details style="margin-top:8px"><summary style="font-size:11px; color:var(--teal); cursor:pointer; font-weight:700">Salin curl</summary><pre style="margin-top:6px; font-size:11px"><code>curl ${(e.examples || [e.example])[0]}</code></pre></details>
          </div>
        </div>`;
        }
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
  /* tablet */
  @media(max-width:900px){
    .hero{grid-template-columns:1fr}
    .grid2{grid-template-columns:1fr}
    .ep-grid{grid-template-columns:1fr !important}
  }
  /* HP */
  @media(max-width:640px){
    .wrap{padding:0 14px}
    .header-inner{padding:10px 0; gap:10px; flex-direction:column; align-items:flex-start}
    .brand{font-size:16px} .brand small{font-size:10px; display:block}
    .nav{width:100%; overflow:auto; -webkit-overflow-scrolling:touch; padding-bottom:2px; margin-left:0; scrollbar-width:none; flex-wrap:nowrap}
    .nav::-webkit-scrollbar{display:none} .nav a{white-space:nowrap; flex:0 0 auto; font-size:11px; padding:6px 10px}
    .hero{padding:16px 0 6px; gap:14px} .hero h1{font-size:24px} .hero p{font-size:13px}
    .chips{gap:6px} .chip{font-size:10px; padding:5px 8px}
    .grid2{grid-template-columns:1fr; gap:10px}
    .card{padding:14px}
    table{font-size:12px; display:block; overflow-x:auto; -webkit-overflow-scrolling:touch}
    th,td{padding:8px 10px; white-space:nowrap}
    pre{font-size:11px; padding:12px; overflow-x:auto; white-space:pre; word-break:normal}
    code{font-size:11px}
    .endpoint{padding:12px}
    .ep-grid{grid-template-columns:1fr !important}
    .tester{padding:14px}
    .tester .btn{width:100%}
    h2{font-size:16px; margin:24px 0 8px}
    h2 .num{width:24px; height:24px; font-size:11px}
    footer{padding:16px 0} footer p{font-size:11px}
  }
  @media(max-width:400px){
    .hero h1{font-size:20px}
    .hero p{font-size:12px}
    .wrap{padding:0 10px}
    .card{padding:12px}
    pre{font-size:10px; padding:10px}
  }
</style>
</head>
<body>
<header>
  <div class="wrap header-inner">
    <div class="brand">API Hadis <small>11 kitab • https://hadisbooks.vercel.app • By Hanif Abdurrohim</small></div>
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
        <code style="flex:1" class="mono">GET https://hadisbooks.vercel.app/books/bukhari/1</code>
        <a class="btn primary" href="https://hadisbooks.vercel.app/books/bukhari/1" target="_blank">Coba</a>
        <a class="btn ghost" href="#tester">Buka tester</a>
      </div>
    </div>
    <div class="card">
      <div class="kicker">Info</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:8px">
        <div><div style="font-size:11px; color:var(--muted)">Total</div><div style="font-weight:800; font-size:22px">${payload.total_hadith.toLocaleString("id-ID")}</div><div style="font-size:11px; color:var(--muted)">hadis dan bab</div></div>
        <div><div style="font-size:11px; color:var(--muted)">Kitab</div><div style="font-weight:800; font-size:22px">${payload.available_books.length}</div><div style="font-size:11px; color:var(--muted)">11 kitab</div></div>
      </div>
      <div style="margin-top:12px; font-size:11px; color:var(--muted)">Base URL produksi</div>
      <code class="mono">https://hadisbooks.vercel.app</code>
      <div style="margin-top:12px" class="callout info"><b>Untuk pemula:</b> Kirim request GET lewat URL, server balas JSON. Tidak perlu login. Cukup fetch atau curl.</div>
    </div>
  </section>

  <section id="quick">
    <h2><span class="num">1</span> Quick start tiga langkah</h2>
    <div class="grid2">
      <div class="card">
        <h3>Langkah 1: Lihat daftar kitab</h3>
        <pre><code>curl https://hadisbooks.vercel.app/books</code></pre>
        <p style="font-size:12px; color:var(--muted)">Dapat 11 ID kitab yang bisa dipakai di endpoint lain.</p>
      </div>
      <div class="card">
        <h3>Langkah 2: Ambil satu hadis</h3>
        <pre><code>curl https://hadisbooks.vercel.app/books/bukhari/1</code></pre>
        <p style="font-size:12px; color:var(--muted)">Ganti bukhari dengan muslim, musnad-syafii, atau riyadush-shalihin.</p>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <h3>Langkah 3: Cari hadis</h3>
      <pre><code>curl "https://hadisbooks.vercel.app/books/bukhari/search?q=wudhu&limit=5"</code></pre>
      <p style="font-size:12px; color:var(--muted)">Cari di semua kitab pakai <code>/search?q=puasa</code>. Tidak perlu API key, CORS sudah aktif.</p>
    </div>
  </section>

  <section id="kitab">
    <h2><span class="num">2</span> Daftar kitab</h2>
    <p style="font-size:13px; color:var(--muted)">Gunakan ID persis seperti di tabel. Contoh: <code>abu-daud</code> pakai strip, bukan spasi.</p>
          <div style="overflow:auto; border-radius:12px; border:1px solid var(--border)">
      <table>
        <tr><th>ID</th><th>Nama</th><th>Jumlah</th><th>Coba</th></tr>
        ${booksHtml}
        <tr style="font-weight:700; background:#f8fafc"><td colspan="2">Total</td><td>${payload.total_hadith.toLocaleString("id-ID")}</td><td>11 kitab</td></tr>
      </table>
    </div>
  </section>

  <section id="endpoints">
    <h2><span class="num">3</span> Endpoints</h2>
    <p style="font-size:13px; color:var(--muted)">Semua endpoint pakai GET. Klik contoh untuk coba langsung.</p>
    ${endpointsHtml}
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
      ${(payload.fields as any).descriptions.map((f: any) => '<tr><td><code>' + f.field + '</code></td><td>' + f.type + '</td><td>' + f.desc + '</td></tr>').join("")}
    </table>
    <p style="font-size:12px; color:var(--muted)">Untuk Riyadhus dan Musnad Syafii, response juga punya <code>html</code> berisi terjemah asli. Search dan random tambah <code>book</code>.</p>
  </section>

  <section id="errors">
    <h2><span class="num">6</span> Error</h2>
    <table>
      <tr><th>Status</th><th>Contoh</th><th>Balasan</th></tr>
      ${(payload.errors as any[]).map((e: any) => '<tr><td>' + e.code + '</td><td><code>' + e.contoh + '</code></td><td><code>' + e.response + '</code></td></tr>').join("")}
    </table>
    <p style="font-size:12px; color:var(--muted)">Semua error berbentuk <code>{ "error": "pesan" }</code>.</p>
  </section>

  <section id="examples">
    <h2><span class="num">7</span> Contoh kode</h2>
    <div class="grid2">
      <div class="card">
        <h3>cURL</h3>
        <pre><code>${(payload.code_examples as any).curl}</code></pre>
      </div>
      <div class="card">
        <h3>Python</h3>
        <pre><code>${(payload.code_examples as any).python.replace(/</g, "&lt;")}</code></pre>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <h3>JavaScript</h3>
      <pre><code>${(payload.code_examples as any).javascript.replace(/</g, "&lt;")}</code></pre>
    </div>
  </section>

  <section id="tester">
    <h2><span class="num">8</span> Live tester</h2>
    <p style="font-size:13px; color:var(--muted)">Satu tester untuk semua route. Pilih endpoint, isi parameter, klik GET. Hasil real dari <code>https://hadisbooks.vercel.app</code>.</p>
    <div class="tester">
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:end">
        <div style="flex:1; min-width:220px">
          <label style="font-size:11px; font-weight:700; color:var(--teal)">Pilih Endpoint</label>
          <select id="u-endpoint" onchange="onEndpointChange()" style="width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:10px; margin-top:4px">
            <option value="/">GET / Info</option>
            <option value="/books">GET /books List 11 kitab</option>
            <option value="/books/{id}" selected>GET /books/{id} Full kitab dan pagination</option>
            <option value="/books/{id}/{number}">GET /books/{id}/{number} Detail satu hadis</option>
            <option value="/books/{id}/search">GET /books/{id}/search?q= Cari per kitab</option>
            <option value="/search">GET /search?q= Cari semua kitab</option>
            <option value="/books/{id}/random">GET /books/{id}/random Acak per kitab</option>
            <option value="/random">GET /random Acak 11 kitab</option>
            <option value="custom">Custom URL manual</option>
          </select>
        </div>
        <div id="u-book-wrap" style="min-width:160px">
          <label style="font-size:11px; font-weight:700; color:var(--teal)">Kitab ID</label>
          <select id="u-book" style="width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:10px; margin-top:4px">
            <option value="bukhari">bukhari (6638)</option><option value="muslim">muslim (4930)</option><option value="abu-daud">abu-daud (4419)</option><option value="tirmidzi">tirmidzi (3625)</option><option value="nasai">nasai (5364)</option><option value="ibnu-majah">ibnu-majah (4285)</option><option value="ahmad">ahmad (4305)</option><option value="darimi">darimi (2949)</option><option value="malik">malik (1587)</option><option value="riyadush-shalihin">riyadush-shalihin (372 bab)</option><option value="musnad-syafii">musnad-syafii (1800)</option>
          </select>
        </div>
        <div id="u-num-wrap" style="display:none; min-width:110px">
          <label style="font-size:11px; font-weight:700; color:var(--teal)">Number</label>
          <input id="u-num" type="number" value="1" min="1" style="width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:10px; margin-top:4px" placeholder="1">
        </div>
        <div id="u-q-wrap" style="display:none; min-width:180px">
          <label style="font-size:11px; font-weight:700; color:var(--teal)">Query q</label>
          <input id="u-q" value="wudhu" style="width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:10px; margin-top:4px" placeholder="min 2 huruf">
        </div>
      </div>

      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:12px">
        <small style="color:var(--muted); align-self:center; font-weight:700">Cepat:</small>
        <button onclick="quick('b1')" style="background:#f0fdfa; border:1px solid #99f6e4; padding:5px 10px; border-radius:999px; cursor:pointer; font-size:11px">Bukhari 1</button>
        <button onclick="quick('musnad1')" style="background:#ede9fe; border:1px solid #c4b5fd; padding:5px 10px; border-radius:999px; cursor:pointer; font-size:11px">Musnad 1</button>
        <button onclick="quick('riyadush1')" style="background:#ede9fe; border:1px solid #c4b5fd; padding:5px 10px; border-radius:999px; cursor:pointer; font-size:11px">Riyadush Bab 7</button>
        <button onclick="quick('searchWudhu')" style="background:#fffbeb; border:1px solid #fcd34d; padding:5px 10px; border-radius:999px; cursor:pointer; font-size:11px">Search wudhu</button>
        <button onclick="quick('searchPuasa')" style="background:#fffbeb; border:1px solid #fcd34d; padding:5px 10px; border-radius:999px; cursor:pointer; font-size:11px">Search puasa</button>
        <button onclick="quick('random')" style="background:#ecfdf5; border:1px solid #a7f3d0; padding:5px 10px; border-radius:999px; cursor:pointer; font-size:11px">Acak</button>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px; align-items:end">
        <div id="u-page-wrap" style="flex:1; min-width:110px">
          <label style="font-size:11px; font-weight:700; color:var(--muted)">page</label>
          <input id="u-page" type="number" value="1" min="1" style="width:100%; padding:8px 12px; border:1px solid var(--border); border-radius:10px; margin-top:4px" placeholder="1">
        </div>
        <div id="u-limit-wrap" style="flex:1; min-width:110px">
          <label style="font-size:11px; font-weight:700; color:var(--muted)">limit max 100</label>
          <input id="u-limit" type="number" value="5" min="1" max="100" style="width:100%; padding:8px 12px; border:1px solid var(--border); border-radius:10px; margin-top:4px" placeholder="20">
        </div>
        <div id="u-range-wrap" style="flex:1; min-width:140px">
          <label style="font-size:11px; font-weight:700; color:var(--muted)">range opsional</label>
          <input id="u-range" placeholder="1-10" style="width:100%; padding:8px 12px; border:1px solid var(--border); border-radius:10px; margin-top:4px">
        </div>
        <div id="u-custom-wrap" style="display:none; flex:2; min-width:220px">
          <label style="font-size:11px; font-weight:700; color:var(--teal)">Custom Path</label>
          <input id="u-custom" value="/books/bukhari/1" style="width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:10px; margin-top:4px; font-family:ui-monospace, monospace" placeholder="/books/bukhari/1">
        </div>
        <button onclick="testUniversal()" style="background:var(--teal); color:white; border:none; padding:11px 18px; border-radius:10px; cursor:pointer; font-weight:800; white-space:nowrap">GET</button>
      </div>

      <div style="margin-top:12px; background:#f8fafc; border:1px solid var(--border); border-radius:10px; padding:10px; display:flex; gap:8px; flex-wrap:wrap; align-items:center">
        <span style="font-size:11px; font-weight:800; color:var(--teal); background:white; border:1px solid #99f6e4; padding:3px 8px; border-radius:6px">GET</span>
        <code id="u-preview" style="flex:1; word-break:break-all; background:transparent; border:none; padding:0; font-size:12px; color:var(--slate)" class="mono">https://hadisbooks.vercel.app/books/bukhari?page=1&limit=5</code>
        <button onclick="copyUrl()" style="background:white; border:1px solid var(--border); padding:6px 12px; border-radius:8px; cursor:pointer; font-size:11px; font-weight:700">Copy</button>
        <a id="u-open" href="https://hadisbooks.vercel.app/books/bukhari?page=1&limit=5" target="_blank" style="font-size:11px; background:var(--teal); color:white; padding:6px 12px; border-radius:8px; text-decoration:none; font-weight:700">Buka</a>
      </div>

      <div style="display:flex; gap:8px; margin-top:12px; align-items:center; flex-wrap:wrap">
        <div id="u-status" style="font-size:11px; color:var(--muted); background:#f1f5f9; padding:6px 10px; border-radius:999px; border:1px solid var(--border)">Siap, klik GET</div>
        <div style="margin-left:auto; display:flex; gap:6px">
          <button onclick="switchTab('json')" id="tab-json" style="background:var(--teal); color:white; border:none; padding:6px 12px; border-radius:999px; cursor:pointer; font-size:11px; font-weight:800">Raw JSON</button>
          <button onclick="switchTab('hadis')" id="tab-hadis" style="background:white; border:1px solid var(--border); padding:6px 12px; border-radius:999px; cursor:pointer; font-size:11px">Hadis View</button>
          <button onclick="copyJson()" style="background:white; border:1px solid var(--border); padding:6px 12px; border-radius:999px; cursor:pointer; font-size:11px">Copy JSON</button>
        </div>
      </div>

      <div id="u-out-json" style="background:#0f172a; color:#e2e8f0; padding:16px; border-radius:12px; font-size:11px; min-height:160px; overflow:auto; max-height:480px; white-space:pre-wrap; word-break:break-word; margin-top:8px; border:1px solid #1e293b; font-family:ui-monospace, monospace; line-height:1.6">Klik GET untuk coba. Tester support 11 kitab, semua route.</div>
      <div id="u-out-hadis" style="display:none; background:white; border:1px solid var(--border); border-radius:12px; padding:16px; margin-top:8px; max-height:560px; overflow:auto">
        <div style="text-align:center; color:var(--muted); padding:20px">Pilih endpoint dan klik GET untuk lihat hadis dalam format rapi, Arab dan Indonesia.</div>
      </div>
    </div>

  </section>
</div>

<script>
const API = "https://hadisbooks.vercel.app";
let lastJson = null;
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
  if(type==='musnad1'){ set('u-endpoint','/books/{id}/{number}'); set('u-book','musnad-syafii'); set('u-num','1'); }
  if(type==='bPage'){ set('u-endpoint','/books/{id}'); set('u-book','bukhari'); set('u-page','1'); set('u-limit','5'); set('u-range',''); }
  if(type==='searchWudhu'){ set('u-endpoint','/books/{id}/search'); set('u-book','bukhari'); set('u-q','wudhu'); }
  if(type==='searchPuasa'){ set('u-endpoint','/search'); set('u-q','puasa'); set('u-limit','5'); }
  if(type==='riyadush1'){ set('u-endpoint','/books/{id}/{number}'); set('u-book','riyadush-shalihin'); set('u-num','7'); }
  if(type==='random'){ set('u-endpoint','/books/{id}/random'); set('u-book','musnad-syafii'); }
  onEndpointChange(); updatePreview(); testUniversal();
}
function switchTab(tab){
  const jsonBtn=document.getElementById('tab-json');
  const hadisBtn=document.getElementById('tab-hadis');
  const jsonEl=document.getElementById('u-out-json');
  const hadisEl=document.getElementById('u-out-hadis');
  if(tab==='json'){
    jsonBtn.style.background='var(--teal)'; jsonBtn.style.color='white'; jsonBtn.style.border='none';
    hadisBtn.style.background='white'; hadisBtn.style.color='var(--slate)'; hadisBtn.style.border='1px solid var(--border)';
    jsonEl.style.display=''; hadisEl.style.display='none';
  } else {
    hadisBtn.style.background='var(--teal)'; hadisBtn.style.color='white'; hadisBtn.style.border='none';
    jsonBtn.style.background='white'; jsonBtn.style.color='var(--slate)'; jsonBtn.style.border='1px solid var(--border)';
    jsonEl.style.display='none'; hadisEl.style.display='';
  }
}
function copyUrl(){
  const url = document.getElementById('u-preview').textContent;
  navigator.clipboard.writeText(url).then(()=>{ const b=document.getElementById('u-preview'); const t=b.textContent; b.textContent='Copied ' + t; setTimeout(()=>b.textContent=url,1200); });
}
function copyJson(){
  if(!lastJson) return;
  const pretty = JSON.stringify(lastJson, null, 2);
  navigator.clipboard.writeText(pretty).then(()=>{
    const btn=document.querySelector('button[onclick="copyJson()"]');
    const old=btn.textContent; btn.textContent='Copied'; setTimeout(()=>btn.textContent=old,1200);
  });
}
function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function renderHadisView(data){
  const el=document.getElementById('u-out-hadis');
  try{
    if(data.error){
      el.innerHTML = '<div style="color:#dc2626; background:#fef2f2; border:1px solid #fecaca; padding:12px; border-radius:8px">Error ' + escapeHtml(data.error) + '</div>';
      return;
    }
    if(data.data && data.data.arab && !Array.isArray(data.data)){
      const h=data.data;
      const book=data.book?'<span style="background:var(--teal);color:white;padding:2px 8px;border-radius:999px;font-size:11px">'+escapeHtml(data.book)+'</span>':'';
      el.innerHTML = '<div style="border:1px solid var(--border); border-radius:12px; padding:16px; background:white">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px"><b>Hadis #' + h.number + '</b> ' + book + '</div>' +
        '<div style="background:#f0fdfa; padding:14px; border-radius:10px; text-align:right; font-family:serif; line-height:2; direction:rtl; font-size:16px; border:1px solid #ccfbf1">' + escapeHtml(h.arab) + '</div>' +
        '<div style="margin-top:12px; line-height:1.8; background:#fafaf9; padding:14px; border-radius:10px; border-left:4px solid var(--teal); font-size:14px">' + escapeHtml(h.id) + '</div>' +
        '</div>';
      return;
    }
    const list = Array.isArray(data.data) ? data.data : (data.data ? [data.data] : []);
    if(list.length && list[0] && list[0].arab){
      const isShort = list.length <= 5;
      el.innerHTML = list.slice(0, isShort ? list.length : 5).map(h=> 
        '<div style="border:1px solid var(--border); border-radius:12px; padding:14px; margin-bottom:12px; background:white">' +
        '<div style="display:flex; justify-content:space-between; margin-bottom:8px"><b>#' + h.number + '</b><small style="color:var(--muted)">' + (data.book?escapeHtml(data.book):'') + '</small></div>' +
        '<div style="background:#f0fdfa; padding:12px; border-radius:10px; text-align:right; direction:rtl; font-family:serif; line-height:1.9; font-size:14px; border:1px solid #ccfbf1">' + escapeHtml(isShort ? h.arab : (h.arab||'').slice(0,600)) + '</div>' +
        '<div style="margin-top:10px; font-size:13px; line-height:1.7; background:#fafaf9; padding:10px; border-radius:8px">' + escapeHtml(isShort ? h.id : (h.id||'').slice(0,500)) + '</div>' +
        '</div>'
      ).join('') + (list.length>5 ? '<div style="text-align:center; color:var(--muted); font-size:11px; background:#f8fafc; padding:8px; border-radius:8px; border:1px dashed var(--border)">+' + (list.length-5) + ' lagi, buka Raw JSON untuk full</div>' : '<div style="text-align:center; color:var(--teal); font-size:11px; margin-top:8px">Full tampil</div>');
      return;
    }
    el.innerHTML = '<div style="color:var(--muted); padding:12px">Lihat tab Raw JSON untuk struktur lengkap. Hadis View aktif untuk response dengan field arab dan id.</div>';
  } catch(e){
    el.innerHTML = '<div style="color:#dc2626">Gagal render: ' + escapeHtml(e.message) + '</div>';
  }
}
function setOut(data, url, ms, status){
  lastJson = data;
  const jsonEl = document.getElementById('u-out-json');
  const pretty = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const isSingle = data && data.data && data.data.arab && !Array.isArray(data.data);
  const limit = isSingle ? 500000 : 50000;
  const sliced = pretty.length > limit ? pretty.slice(0,limit) + "\\nTerpotong " + (pretty.length-limit) + " char, buka di tab untuk full: " + url : pretty;
  jsonEl.textContent = "GET " + url + " [" + status + "] (" + ms + "ms, " + new Blob([pretty]).size + " bytes)\\n" + sliced;
  const statusEl=document.getElementById('u-status');
  const ok = status>=200 && status<300;
  statusEl.textContent = (ok?'Sukses ':'Gagal ') + status + ' • ' + ms + 'ms • ' + new Blob([pretty]).size + ' bytes' + (isSingle ? ' • full' : '');
  statusEl.style.background = ok ? '#ecfdf5' : '#fef2f2';
  statusEl.style.color = ok ? '#065f46' : '#991b1b';
  statusEl.style.borderColor = ok ? '#a7f3d0' : '#fecaca';
  renderHadisView(data);
}
async function testUniversal(){
  const url = buildUrl();
  const jsonEl = document.getElementById('u-out-json');
  const statusEl=document.getElementById('u-status');
  jsonEl.textContent = "Memuat " + url + " ...";
  document.getElementById('u-out-hadis').innerHTML = '<div style="text-align:center; color:var(--muted); padding:20px">Memuat</div>';
  statusEl.textContent = 'Memuat';
  statusEl.style.background='#fef3c7'; statusEl.style.color='#92400e'; statusEl.style.borderColor='#fcd34d';
  const t0 = performance.now();
  try{
    const r = await fetch(url);
    const ms = Math.round(performance.now()-t0);
    const j = await r.json();
    setOut(j, url, ms, r.status);
  }catch(e){
    jsonEl.textContent = "Error " + e.message + "\\nURL " + url;
    document.getElementById('u-out-hadis').innerHTML = '<div style="color:#dc2626; background:#fef2f2; padding:12px; border-radius:8px">Error ' + escapeHtml(e.message) + '</div>';
    statusEl.textContent='Error'; statusEl.style.background='#fef2f2'; statusEl.style.color='#991b1b';
  }
}
window.addEventListener('load', ()=>{ onEndpointChange(); setTimeout(testUniversal, 600); });
</script>

<footer>
  <p>© ${new Date().getFullYear()} By <strong>Hanif Abdurrohim</strong> • Dibuat dengan Hono dan TypeScript • Deploy di Vercel • <a href="https://github.com/dextryayers" target="_blank">GitHub @dextryayers</a></p>
  <p style="font-size:11px">Data 11 kitab dari folder assets • Field arab dan id • Gratis, tanpa API key, CORS aktif</p>
  <p><a href="https://hadisbooks.vercel.app/books" target="_blank">Lihat /books JSON</a> • <a href="https://hadisbooks.vercel.app/books/bukhari/1" target="_blank">Contoh hadis</a> • <a href="https://github.com/dextryayers" target="_blank">GitHub</a></p>
</footer>
</div>
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
  }, 200, cacheHeaders(3600, 86400));
});

// Search across all books? /search?q=
app.get("/search", (c) => {
  const q = c.req.query("q");
  if (!q || q.trim().length < 2) {
    return c.json({ error: "query param 'q' minimal 2 karakter" }, 400);
  }
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 50);
  const results: any[] = [];

  for (const bookId of BOOK_IDS) {
    const matched = searchBookData(bookId, q);
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
  }, 200, { "Cache-Control": "no-cache" });
});

// Random hadith
app.get("/random", (c) => {
  const bookParamRaw = c.req.query("book");
  const bookParam = bookParamRaw ? normalizeBookId(bookParamRaw) : undefined;
  const bookId = bookParam && BOOKS[bookParam] ? bookParam : BOOK_IDS[Math.floor(Math.random() * BOOK_IDS.length)];
  const data = getBookData(bookId);
  const random = data[Math.floor(Math.random() * data.length)];
  return c.json({ book: bookId, data: random }, 200, { "Cache-Control": "no-store" });
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
    }, 200, cacheHeaders(3600, 86400));
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
    }, 200, cacheHeaders(3600, 86400));
  }

  // Default: paginated page 1 limit 20
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
    data: paginated,
  }, 200, cacheHeaders(3600, 86400));
});

// GET /books/:book/search?q=
app.get("/books/:book/search", (c) => {
  const bookIdRaw = c.req.param("book");
  const bookId = normalizeBookId(bookIdRaw);
  if (!BOOKS[bookId]) return c.json({ error: `Kitab tidak ditemukan: ${bookIdRaw}` }, 404);
  const q = c.req.query("q");
  if (!q || q.trim().length < 2) return c.json({ error: "query param 'q' minimal 2 karakter" }, 400);
  const matched = searchBookData(bookId, q);
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
  const page = parseInt(c.req.query("page") || "1");
  const start = (page - 1) * limit;
  const sliced = matched.slice(start, start + limit);
  return c.json({
    book: bookId,
    query: q,
    pagination: { page, limit, total: matched.length, totalPages: Math.ceil(matched.length / limit) },
    data: sliced,
  }, 200, { "Cache-Control": "no-cache" });
});

// GET /books/:book/random
app.get("/books/:book/random", (c) => {
  const bookIdRaw = c.req.param("book");
  const bookId = normalizeBookId(bookIdRaw);
  if (!BOOKS[bookId]) return c.json({ error: `Kitab tidak ditemukan: ${bookIdRaw}` }, 404);
  const data = getBookData(bookId);
  const random = data[Math.floor(Math.random() * data.length)];
  return c.json({ book: bookId, data: random }, 200, { "Cache-Control": "no-store" });
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
  return c.json({ book: bookId, data: hadith }, 200, cacheHeaders(86400));
});

// 404 handler
app.notFound((c) => c.json({ error: "Endpoint tidak ditemukan", path: c.req.path }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal Server Error", message: err.message }, 500);
});

export default app;
