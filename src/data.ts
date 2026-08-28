import type { Hadith } from "./types.js";
import { BOOKS, normalizeBookId } from "./types.js";

const BASE = "https://hadisbooks.vercel.app";

const cache = new Map<string, Hadith[]>();
const hadithIndex = new Map<string, Map<number, Hadith>>();
const searchIndex = new Map<string, { text: string; hadith: Hadith }[]>();

function stripHtml(html: string): string {
  if (!html) return "";
  let text = html
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  text = text.replace(/<[^>]*>/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

async function fetchJson(url: string): Promise<any> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Fetch failed ${r.status}: ${url}`);
  return r.json();
}

function buildIndexes(bookId: string, bookIdRaw: string, all: Hadith[]) {
  cache.set(bookId, all);
  if (bookIdRaw !== bookId) cache.set(bookIdRaw, all);
  const numMap = new Map<number, Hadith>();
  for (const h of all) numMap.set(h.number, h);
  hadithIndex.set(bookId, numMap);
  if (bookIdRaw !== bookId) hadithIndex.set(bookIdRaw, numMap);
  const searchItems = all.map(h => ({ text: (h.id || "").toLowerCase(), hadith: h }));
  searchIndex.set(bookId, searchItems);
  if (bookIdRaw !== bookId) searchIndex.set(bookIdRaw, searchItems);
}

export async function getBookData(bookIdRaw: string): Promise<Hadith[]> {
  const bookId = normalizeBookId(bookIdRaw);
  const book = BOOKS[bookId];
  if (!book) throw new Error(`Book not found: ${bookIdRaw}`);
  if (cache.has(bookId)) return cache.get(bookId)!;

  let all: Hadith[] = [];

  if (book.isRiyadush) {
    const files = ["1.json", "2.json", "3.json"];
    for (const f of files) {
      const parsed = await fetchJson(`${BASE}/riyadush-sholihin/${f}`) as Array<{ id: number; arab: string; terjemah: string }>;
      for (const item of parsed) {
        const arab = (item.arab || "").trim();
        const html = (item.terjemah || "").trim();
        all.push({ number: item.id, arab, id: stripHtml(html), html });
      }
    }
    all.sort((a, b) => a.number - b.number);
  } else if (book.isMusnadSyafii) {
    for (let i = 1; i <= 12; i++) {
      const parsed = await fetchJson(`${BASE}/musnad-syafii/${i}.json`) as Array<{ id: number; arab: string; terjemah: string }>;
      for (const item of parsed) {
        const arab = (item.arab || "").trim();
        const html = (item.terjemah || "").trim();
        all.push({ number: item.id, arab, id: stripHtml(html), html });
      }
    }
    all.sort((a, b) => a.number - b.number);
  } else {
    all = await fetchJson(`${BASE}/data/${book.file}`) as Hadith[];
  }

  buildIndexes(bookId, bookIdRaw, all);
  return all;
}

export async function getHadithByNumber(bookIdRaw: string, number: number): Promise<Hadith | undefined> {
  const bookId = normalizeBookId(bookIdRaw);
  const idx = hadithIndex.get(bookId);
  if (idx) return idx.get(number);
  const data = await getBookData(bookIdRaw);
  return data.find((h) => h.number === number);
}

export async function searchBookData(bookIdRaw: string, query: string): Promise<Hadith[]> {
  const bookId = normalizeBookId(bookIdRaw);
  const lowerQ = query.toLowerCase();
  const idx = searchIndex.get(bookId);
  if (idx) return idx.filter(item => item.text.includes(lowerQ)).map(item => item.hadith);
  const data = await getBookData(bookIdRaw);
  return data.filter(h => (h.id || "").toLowerCase().includes(lowerQ));
}

export function clearCache() {
  cache.clear();
  hadithIndex.clear();
  searchIndex.clear();
}
