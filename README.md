# API Hadis - 9 Kitab

API Hadis Indonesia + Arab, siap deploy ke **Vercel**. Data 38k+ hadis dari 9 kitab.

**Stack:** Hono + TypeScript (Vercel Serverless, 69MB data lazy-load)

## Kitab Tersedia (9)
- `bukhari` (6638) - Shahih Bukhari
- `muslim` (4930) - Shahih Muslim
- `abu-daud` (4419)
- `tirmidzi` (3625)
- `nasai` (5364)
- `ibnu-majah` (4285)
- `ahmad` (4305)
- `darimi` (2949)
- `malik` (1587)

## Jalankan Lokal
```bash
npm install
npm run dev # http://localhost:3000
```

## Endpoint

### Root
```
GET / -> info API
```

### List Kitab
```
GET /books
```

### Full Kitab per Perawi (sesuai request)
```
GET /books/bukhari
GET /books/muslim
GET /books/abu-daud
GET /books/tirmidzi
GET /books/nasai
GET /books/ibnu-majah
GET /books/ahmad
GET /books/darimi
GET /books/malik
```
*Default* `GET /books/bukhari` return 20 hadis pertama + pagination hint. Untuk full, paginasi:

```
GET /books/bukhari?page=1&limit=20   # max 100 per request
GET /books/bukhari?page=2&limit=20
GET /books/bukhari?range=1-100       # ambil nomor 1-100
GET /books/bukhari?range=1-50
```

Loop paginasi untuk dapat 6638 full: `page=1..332` dengan `limit=20`.

### Detail Hadis
```
GET /books/bukhari/1
GET /books/muslim/500
```

### Search
```
GET /books/bukhari/search?q=wudhu
GET /books/bukhari/search?q=niat&limit=10&page=1
GET /search?q=puasa&limit=20   # search semua kitab
```

### Random
```
GET /books/bukhari/random
GET /random?book=muslim
GET /random  # random dari 9 kitab
```

## Deploy ke Vercel
```bash
npm i -g vercel
vercel --prod
```
`vercel.json` sudah set `includeFiles: data/**` dan rewrite `/(.*) -> /api`

## Struktur
```
api/index.ts   -> Vercel entry (handle Hono)
src/app.ts     -> Hono app & routes
src/data.ts    -> lazy loader 9 JSON (cache per kitab)
src/types.ts   -> definisi Book
data/*.json    -> 9 file hadis
```

## Catatan Vercel
- Response limit Vercel ~5MB, jadi full 6638 hadis (12MB) tidak dikembalikan sekaligus. Gunakan pagination `?page` / `?range`.
- Data di-load lazy per kitab via `fs`, jadi memory serverless hemat (cuma load 1 file per request).

## Contoh curl
```bash
curl https://your-api.vercel.app/books/bukhari/1
curl https://your-api.vercel.app/books/muslim?page=1&limit=5
curl https://your-api.vercel.app/books/bukhari?range=1-10
```
