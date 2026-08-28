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

export async function getHadithByNumber(bookIdRaw: string, num: number): Promise<Hadith | undefined> {
  const bookId = normalizeBookId(bookIdRaw);
  const m = idxNum.get(bookId);
  if (m) return m.get(num);
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
