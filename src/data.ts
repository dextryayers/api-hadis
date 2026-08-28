import type { Hadith } from "./types.js";
import { BOOKS, normalizeBookId } from "./types.js";

const CDN = "https://hadisbooks.vercel.app";

function stripHtml(html: string): string {
  if (!html) return "";
  let t = html.replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  t = t.replace(/<[^>]*>/g, " ");
  return t.replace(/\s+/g, " ").trim();
}

async function fetchJson(path: string): Promise<any> {
  const r = await fetch(`${CDN}${path}`, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`fetch ${path} ${r.status}`);
  return r.json();
}

const cache = new Map<string, Hadith[]>();
const idxNum = new Map<string, Map<number, Hadith>>();
const idxSearch = new Map<string, { text: string; hadith: Hadith }[]>();

function buildNumIdx(bookId: string, raw: string, all: Hadith[]) {
  const m = new Map<number, Hadith>();
  for (const h of all) m.set(h.number, h);
  idxNum.set(bookId, m);
  if (raw !== bookId) idxNum.set(raw, m);
  cache.set(bookId, all);
  if (raw !== bookId) cache.set(raw, all);
}

function buildSearchIdx(bookId: string, all: Hadith[]) {
  if (idxSearch.has(bookId)) return;
  const arr = all.map((h) => ({ text: (h.id || "").toLowerCase(), hadith: h }));
  idxSearch.set(bookId, arr);
}

export async function getBookData(bookIdRaw: string): Promise<Hadith[]> {
  const bookId = normalizeBookId(bookIdRaw);
  const book = BOOKS[bookId];
  if (!book) throw new Error(`Book not found: ${bookIdRaw}`);
  if (cache.has(bookId)) return cache.get(bookId)!;
  let all: Hadith[] = [];
  if (book.isRiyadush) {
    const parts = await Promise.all([fetchJson("/riyadush-sholihin/1.json"), fetchJson("/riyadush-sholihin/2.json"), fetchJson("/riyadush-sholihin/3.json")]);
    for (const arr of parts as any[][]) for (const it of arr as any[]) all.push({ number: it.id, arab: (it.arab || "").trim(), id: stripHtml((it.terjemah || "").trim()), html: (it.terjemah || "").trim() });
    all.sort((a, b) => a.number - b.number);
  } else if (book.isMusnadSyafii) {
    const promises = Array.from({ length: 12 }, (_, i) => fetchJson(`/musnad-syafii/${i + 1}.json`));
    const parts = await Promise.all(promises);
    for (const arr of parts as any[][]) for (const it of arr as any[]) all.push({ number: it.id, arab: (it.arab || "").trim(), id: stripHtml((it.terjemah || "").trim()), html: (it.terjemah || "").trim() });
    all.sort((a, b) => a.number - b.number);
  } else {
    all = (await fetchJson(`/data/${book.file}`)) as Hadith[];
  }
  buildNumIdx(bookId, bookIdRaw, all);
  return all;
}

export async function getBookPage(bookIdRaw: string, page: number, limit: number): Promise<{ data: Hadith[]; total: number }> {
  const bookId = normalizeBookId(bookIdRaw);
  const book = BOOKS[bookId];
  if (!book) throw new Error(`Book not found: ${bookIdRaw}`);
  const total = book.available;
  // riyadush/musnad still use full load (small: 372, 1800)
  if (book.isRiyadush || book.isMusnadSyafii) {
    const all = await getBookData(bookIdRaw);
    const start = (page - 1) * limit;
    return { data: all.slice(start, start + limit), total };
  }
  // use chunk: chunk size 100
  const chunkSize = 100;
  const startIdx = (page - 1) * limit;
  const endIdx = startIdx + limit;
  const startChunk = Math.floor(startIdx / chunkSize) + 1;
  const endChunk = Math.floor((endIdx - 1) / chunkSize) + 1;
  const chunks: Hadith[][] = [];
  for (let c = startChunk; c <= endChunk; c++) {
    try {
      const arr = (await fetchJson(`/data/${bookId}/${c}.json`)) as Hadith[];
      chunks.push(arr);
    } catch {
      // fallback to full file if chunk missing
      const all = await getBookData(bookIdRaw);
      return { data: all.slice(startIdx, startIdx + limit), total };
    }
  }
  const merged = chunks.flat();
  const offset = startIdx % chunkSize;
  // if we fetched 2 chunks, merged length 200, need slice offset
  return { data: merged.slice(offset, offset + limit), total };
}

export async function getHadithByNumber(bookIdRaw: string, num: number): Promise<Hadith | undefined> {
  const bookId = normalizeBookId(bookIdRaw);
  const m = idxNum.get(bookId);
  if (m) return m.get(num);
  // try chunk for non-riyadush: chunk = ceil(num/100)
  const book = BOOKS[bookId];
  if (book && !book.isRiyadush && !book.isMusnadSyafii) {
    const chunk = Math.ceil(num / 100);
    try {
      const arr = (await fetchJson(`/data/${bookId}/${chunk}.json`)) as Hadith[];
      const found = arr.find((h) => h.number === num);
      if (found) {
        // warm cache for that chunk
        return found;
      }
    } catch {}
  }
  const data = await getBookData(bookIdRaw);
  return data.find((h) => h.number === num);
}

export async function searchBookData(bookIdRaw: string, q: string): Promise<Hadith[]> {
  const bookId = normalizeBookId(bookIdRaw);
  const lower = q.toLowerCase();
  const s = idxSearch.get(bookId);
  if (s) return s.filter((x) => x.text.includes(lower)).map((x) => x.hadith);
  const data = await getBookData(bookIdRaw);
  buildSearchIdx(bookId, data);
  return idxSearch.get(bookId)!.filter((x) => x.text.includes(lower)).map((x) => x.hadith);
}

export function clearCache() {
  cache.clear();
  idxNum.clear();
  idxSearch.clear();
}
