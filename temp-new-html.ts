const newHtml = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>API Hadis 10 Kitab - By Hanif Abdurrohim</title>
<meta name="description" content="API Hadis 10 kitab, gratis, tanpa API key. Akses 40 ribu hadis lengkap Arab dan Indonesia.">
<style>
  :root{--teal:#0f766e;--teal-dark:#115e59;--slate:#1e293b;--muted:#64748b;--bg:#f8fafc;--card:#ffffff;--border:#e2e8f0;--code:#f1f5f9}
  *{box-sizing:border-box} html{scroll-behavior:smooth}
  body{font-family:Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, sans-serif; margin:0; color:var(--slate); background:var(--bg); line-height:1.65}
  a{color:var(--teal); text-decoration:none} a:hover{text-decoration:underline}
  header{position:sticky; top:0; z-index:20; background:rgba(255,255,255,0.9); backdrop-filter:blur(8px); border-bottom:1px solid var(--border)}
  .wrap{max-width:1120px; margin:0 auto; padding:0 20px}
  .header-inner{display:flex; align-items:center; gap:16px; padding:14px 0; flex-wrap:wrap}
  .brand{font-weight:800; color:var(--teal); font-size:18px; letter-spacing:-0.02em}
  .brand small{display:block; font-weight:500; color:var(--muted); font-size:12px; letter-spacing:0}
  .nav{display:flex; gap:8px; flex-wrap:wrap; margin-left:auto}
  .nav a{font-size:13px; padding:6px 10px; border:1px solid var(--border); border-radius:999px; background:var(--card); color:var(--slate)}
  .nav a:hover{border-color:var(--teal); color:var(--teal)}
  .hero{padding:28px 0 10px; display:grid; grid-template-columns:1.2fr 0.8fr; gap:24px} @media(max-width:860px){.hero{grid-template-columns:1fr}}
  .hero h1{margin:0; font-size:32px; letter-spacing:-0.03em; line-height:1.15; color:var(--slate)}
  .hero p{color:var(--muted); margin:10px 0 0}
  .chips{display:flex; gap:8px; flex-wrap:wrap; margin-top:12px}
  .chip{font-size:12px; padding:6px 10px; border-radius:999px; border:1px solid var(--border); background:var(--card)}
  .chip.teal{background:var(--teal); color:white; border-color:var(--teal)}
  .chip.dark{background:var(--slate); color:#f1f5f9; border-color:var(--slate)}
  .grid2{display:grid; grid-template-columns:1fr 1fr; gap:16px} @media(max-width:860px){.grid2{grid-template-columns:1fr}}
  .card{background:var(--card); border:1px solid var(--border); border-radius:14px; padding:18px}
  h2{font-size:18px; margin:28px 0 10px; letter-spacing:-0.02em; color:var(--slate); display:flex; align-items:center; gap:10px}
  h2 span.num{width:28px; height:28px; display:inline-grid; place-items:center; background:var(--teal); color:white; border-radius:8px; font-size:13px; font-weight:700}
  h3{font-size:14px; margin:16px 0 8px; color:var(--slate)}
  table{width:100%; border-collapse:separate; border-spacing:0; overflow:hidden; border:1px solid var(--border); border-radius:10px; background:var(--card); font-size:13px}
  th,td{padding:10px 12px; text-align:left; border-bottom:1px solid var(--border)} th{background:#f8fafc; font-weight:600; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; color:var(--muted)} tr:last-child td{border-bottom:none}
  code{background:var(--code); padding:2px 6px; border-radius:6px; font-size:12px; border:1px solid var(--border)}
  pre{background:#0f172a; color:#e2e8f0; padding:14px; border-radius:10px; overflow:auto; font-size:12px; line-height:1.6; border:1px solid #1e293b}
  pre code{background:transparent; border:none; color:inherit; padding:0}
  .endpoint{background:var(--card); border:1px solid var(--border); border-left:3px solid var(--teal); border-radius:12px; padding:14px 16px; margin:10px 0}
  .endpoint p{margin:6px 0 0; color:var(--muted); font-size:13px}
  .method{display:inline-block; background:var(--teal); color:white; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700; letter-spacing:0.04em}
  .callout{border-radius:12px; padding:12px 14px; font-size:13px; border:1px solid}
  .callout.info{background:#f0fdfa; border-color:#99f6e4; color:#134e4a}
  .callout.warn{background:#fffbeb; border-color:#fcd34d; color:#92400e}
  .tester{background:var(--card); border:1px solid var(--border); border-radius:14px; padding:18px; box-shadow:0 4px 16px rgba(15,118,110,0.06)}
  .input, select{width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:10px; background:white; font-size:13px}
  .input:focus, select:focus{outline:none; border-color:var(--teal); box-shadow:0 0 0 3px rgba(15,118,110,0.12)}
  .btn{appearance:none; border:none; padding:10px 16px; border-radius:10px; font-weight:700; font-size:13px; cursor:pointer}
  .btn.primary{background:var(--teal); color:white} .btn.primary:hover{background:var(--teal-dark)}
  .btn.ghost{background:white; border:1px solid var(--border); color:var(--slate)}
  .badge{font-size:11px; padding:4px 8px; border-radius:999px; border:1px solid var(--border); background:var(--card)}
  footer{margin-top:32px; padding:20px 0; border-top:1px solid var(--border); color:var(--muted); font-size:12px; text-align:center}
  .kicker{font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:var(--teal); font-weight:700}
</style>
</head>
<body>
<header>
  <div class="wrap header-inner">
    <div class="brand">API Hadis <small>10 kitab • https://api-hadith.vercel.app • By Hanif Abdurrohim</small></div>
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
      <h1>API Hadis 10 Kitab untuk aplikasi Indonesia</h1>
      <p>Akses 40.274 hadis dan bab dari 9 Kutubut Tisah ditambah Riyadhus Shalihin dan Musnad Syafii. Teks Arab dan terjemahan Indonesia, siap pakai untuk web, mobile, dan bot.</p>
      <div class="chips">
        <span class="chip teal">REST • JSON</span>
        <span class="chip">40.274 data</span>
        <span class="chip">Arab + Indonesia</span>
        <span class="chip dark">Vercel Ready</span>
      </div>
      <div class="card" style="margin-top:16px; display:flex; gap:10px; align-items:center; flex-wrap:wrap">
        <code style="flex:1">GET https://api-hadith.vercel.app/books/bukhari/1</code>
        <a class="btn primary" href="https://api-hadith.vercel.app/books/bukhari/1" target="_blank">Coba</a>
        <a class="btn ghost" href="#tester">Buka tester</a>
      </div>
    </div>
    <div class="card">
      <div class="kicker">Info</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:8px">
        <div><div style="font-size:12px; color:var(--muted)">Total</div><div style="font-weight:800; font-size:20px">\${payload.total_hadith.toLocaleString("id-ID")}</div><div style="font-size:12px; color:var(--muted)">hadis dan bab</div></div>
        <div><div style="font-size:12px; color:var(--muted)">Kitab</div><div style="font-weight:800; font-size:20px">\${payload.available_books.length}</div><div style="font-size:12px; color:var(--muted)">10 kitab</div></div>
      </div>
      <div style="margin-top:12px; font-size:12px; color:var(--muted)">Base URL produksi</div>
      <code>https://api-hadith.vercel.app</code>
      <div style="margin-top:12px" class="callout info"><b>Untuk pemula:</b> Kirim request GET via URL, server balas JSON. Tidak perlu login. Cukup fetch atau curl.</div>
    </div>
  </section>

  <section id="quick">
    <h2><span class="num">1</span> Quick start 3 langkah</h2>
    <div class="grid2">
      <div class="card">
        <h3>Langkah 1: Lihat daftar kitab</h3>
        <pre><code>curl https://api-hadith.vercel.app/books</code></pre>
        <p style="font-size:12px; color:var(--muted)">Dapat 10 ID kitab yang bisa dipakai di endpoint lain.</p>
      </div>
      <div class="card">
        <h3>Langkah 2: Ambil satu hadis</h3>
        <pre><code>curl https://api-hadith.vercel.app/books/bukhari/1</code></pre>
        <p style="font-size:12px; color:var(--muted)">Ganti bukhari dengan muslim, nasai, atau musnad-syafii.</p>
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
    <div style="overflow:auto; border-radius:10px; border:1px solid var(--border)">
      <table>
        <tr><th>ID</th><th>Nama</th><th>Jumlah</th><th>Coba</th></tr>
        \${booksHtml}
        <tr style="font-weight:700; background:#f8fafc"><td colspan="2">Total</td><td>\${payload.total_hadith.toLocaleString("id-ID")}</td><td>10 kitab</td></tr>
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
