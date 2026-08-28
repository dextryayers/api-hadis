import fs from "node:fs";
import path from "node:path";
import type { Hadith } from "./types.js";
import { BOOKS, normalizeBookId } from "./types.js";

function getDataDir(): string {
  return path.join(process.cwd(), "assets", "data");
}

function getRiyadushDir(): string {
  return path.join(process.cwd(), "assets", "riyadush-sholihin");
}

function getMusnadSyafiiDir(): string {
  return path.join(process.cwd(), "assets", "musnad-syafii");
}

function stripHtml(html: string): string {
  if (!html) return "";
  // decode entities common
  let text = html
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  // remove tags
  text = text.replace(/<[^>]*>/g, " ");
  // collapse whitespace
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

const cache = new Map<string, Hadith[]>();
const hadithIndex = new Map<string, Map<number, Hadith>>();
const searchIndex = new Map<string, { text: string; hadith: Hadith }[]>();

export function getBookData(bookIdRaw: string): Hadith[] {
  const bookId = normalizeBookId(bookIdRaw);
  const book = BOOKS[bookId];
  if (!book) throw new Error(`Book not found: ${bookIdRaw}`);

  if (cache.has(bookId)) return cache.get(bookId)!;

  let all: Hadith[] = [];

  // khusus Riyadhus Shalihin: gabung 3 file
  if (book.isRiyadush) {
    const riyadushDir = getRiyadushDir();
    if (!fs.existsSync(riyadushDir)) {
      throw new Error(`Riyadush dir not found: ${riyadushDir}`);
    }
    const files = ["1.json", "2.json", "3.json"];
    for (const f of files) {
      const fp = path.join(riyadushDir, f);
      if (!fs.existsSync(fp)) continue;
      const raw = fs.readFileSync(fp, "utf-8");
      const parsed = JSON.parse(raw) as Array<{ id: number; arab: string; terjemah: string }>;
      for (const item of parsed) {
        const arab = (item.arab || "").trim();
        const html = (item.terjemah || "").trim();
        const plain = stripHtml(html);
        all.push({ number: item.id, arab, id: plain, html });
      }
    }
    all.sort((a, b) => a.number - b.number);
  } else if (book.isMusnadSyafii) {
    const musnadDir = getMusnadSyafiiDir();
    if (!fs.existsSync(musnadDir)) {
      throw new Error(`Musnad Syafii dir not found: ${musnadDir}`);
    }
    const files = Array.from({ length: 12 }, (_, i) => `${i + 1}.json`);
    for (const f of files) {
      const fp = path.join(musnadDir, f);
      if (!fs.existsSync(fp)) continue;
      const raw = fs.readFileSync(fp, "utf-8");
      const parsed = JSON.parse(raw) as Array<{ id: number; arab: string; terjemah: string }>;
      for (const item of parsed) {
        const arab = (item.arab || "").trim();
        const html = (item.terjemah || "").trim();
        const plain = stripHtml(html);
        all.push({ number: item.id, arab, id: plain, html });
      }
    }
    all.sort((a, b) => a.number - b.number);
  } else {
    const dataDir = getDataDir();
    const filePath = path.join(dataDir, book.file);
    if (!fs.existsSync(filePath)) {
      const alt = path.join(process.cwd(), "data", book.file);
      if (fs.existsSync(alt)) {
        all = JSON.parse(fs.readFileSync(alt, "utf-8")) as Hadith[];
      } else {
        throw new Error(`Data file not found: ${filePath}`);
      }
    } else {
      all = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Hadith[];
    }
  }

  cache.set(bookId, all);
  if (bookIdRaw !== bookId) cache.set(bookIdRaw, all);

  // build hadith index (O(1) lookup by number)
  const numMap = new Map<number, Hadith>();
  for (const h of all) numMap.set(h.number, h);
  hadithIndex.set(bookId, numMap);
  if (bookIdRaw !== bookId) hadithIndex.set(bookIdRaw, numMap);

  // build search index (lowercase text for fast search)
  const searchItems = all.map(h => ({ text: (h.id || "").toLowerCase(), hadith: h }));
  searchIndex.set(bookId, searchItems);
  if (bookIdRaw !== bookId) searchIndex.set(bookIdRaw, searchItems);

  return all;
}

export function getHadithByNumber(bookIdRaw: string, number: number): Hadith | undefined {
  const bookId = normalizeBookId(bookIdRaw);
  // try index first (O(1))
  const idx = hadithIndex.get(bookId);
  if (idx) return idx.get(number);
  // fallback: load and find
  const data = getBookData(bookIdRaw);
  return data.find((h) => h.number === number);
}

export function searchBookData(bookIdRaw: string, query: string): Hadith[] {
  const bookId = normalizeBookId(bookIdRaw);
  const lowerQ = query.toLowerCase();
  const idx = searchIndex.get(bookId);
  if (idx) {
    return idx.filter(item => item.text.includes(lowerQ)).map(item => item.hadith);
  }
  // fallback: load and filter
  const data = getBookData(bookIdRaw);
  return data.filter(h => (h.id || "").toLowerCase().includes(lowerQ));
}

export function clearCache() {
  cache.clear();
  hadithIndex.clear();
  searchIndex.clear();
}
