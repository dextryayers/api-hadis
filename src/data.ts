import fs from "node:fs";
import path from "node:path";
import type { Hadith } from "./types.js";
import { BOOKS, normalizeBookId } from "./types.js";

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

function resolveFile(...segments: string[]): string {
  const p1 = path.join(process.cwd(), ...segments);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(process.cwd(), "public", ...segments);
  if (fs.existsSync(p2)) return p2;
  return p1;
}

const cache = new Map<string, Hadith[]>();
const hadithIndex = new Map<string, Map<number, Hadith>>();
const searchIndex = new Map<string, { text: string; hadith: Hadith }[]>();

function ensureIndex(bookId: string, bookIdRaw: string, all: Hadith[]) {
  if (!hadithIndex.has(bookId)) {
    const m = new Map<number, Hadith>();
    for (const h of all) m.set(h.number, h);
    hadithIndex.set(bookId, m);
    if (bookIdRaw !== bookId) hadithIndex.set(bookIdRaw, m);
  }
  cache.set(bookId, all);
  if (bookIdRaw !== bookId) cache.set(bookIdRaw, all);
}

function ensureSearchIndex(bookId: string, all: Hadith[]) {
  if (searchIndex.has(bookId)) return;
  const items = all.map((h) => ({ text: (h.id || "").toLowerCase(), hadith: h }));
  searchIndex.set(bookId, items);
  const alias = [...cache.entries()].find(([, v]) => v === all)?.[0];
  if (alias && alias !== bookId) searchIndex.set(alias, items);
}

export async function getBookData(bookIdRaw: string): Promise<Hadith[]> {
  const bookId = normalizeBookId(bookIdRaw);
  const book = BOOKS[bookId];
  if (!book) throw new Error(`Book not found: ${bookIdRaw}`);
  if (cache.has(bookId)) return cache.get(bookId)!;

  let all: Hadith[] = [];

  if (book.isRiyadush) {
    const baseCandidates = [
      path.join(process.cwd(), "assets", "riyadush-sholihin"),
      path.join(process.cwd(), "public", "riyadush-sholihin"),
      path.join(process.cwd(), "assets", "riyadush-shalihin"),
      path.join(process.cwd(), "public", "riyadush-shalihin"),
      path.join(process.cwd(), "assets", "riyadhus-shalihin"),
    ];
    let dir = baseCandidates.find((d) => fs.existsSync(d)) || baseCandidates[0];
    for (const f of ["1.json", "2.json", "3.json"]) {
      const fp = path.join(dir, f);
      if (!fs.existsSync(fp)) continue;
      const raw = fs.readFileSync(fp, "utf-8");
      const parsed = JSON.parse(raw) as Array<{ id: number; arab: string; terjemah: string }>;
      for (const item of parsed) {
        const arab = (item.arab || "").trim();
        const html = (item.terjemah || "").trim();
        all.push({ number: item.id, arab, id: stripHtml(html), html });
      }
    }
    all.sort((a, b) => a.number - b.number);
  } else if (book.isMusnadSyafii) {
    const baseCandidates = [
      path.join(process.cwd(), "assets", "musnad-syafii"),
      path.join(process.cwd(), "public", "musnad-syafii"),
    ];
    let dir = baseCandidates.find((d) => fs.existsSync(d)) || baseCandidates[0];
    for (let i = 1; i <= 12; i++) {
      const fp = path.join(dir, `${i}.json`);
      if (!fs.existsSync(fp)) continue;
      const raw = fs.readFileSync(fp, "utf-8");
      const parsed = JSON.parse(raw) as Array<{ id: number; arab: string; terjemah: string }>;
      for (const item of parsed) {
        const arab = (item.arab || "").trim();
        const html = (item.terjemah || "").trim();
        all.push({ number: item.id, arab, id: stripHtml(html), html });
      }
    }
    all.sort((a, b) => a.number - b.number);
  } else {
    const fp = resolveFile("assets", "data", book.file);
    const alt = resolveFile("public", "data", book.file);
    const finalPath = fs.existsSync(fp) ? fp : alt;
    if (!fs.existsSync(finalPath)) throw new Error(`Data file not found: ${finalPath}`);
    const raw = fs.readFileSync(finalPath, "utf-8");
    all = JSON.parse(raw) as Hadith[];
  }

  ensureIndex(bookId, bookIdRaw, all);
  return all;
}

export async function getHadithByNumber(bookIdRaw: string, num: number): Promise<Hadith | undefined> {
  const bookId = normalizeBookId(bookIdRaw);
  const idx = hadithIndex.get(bookId);
  if (idx) return idx.get(num);
  const data = await getBookData(bookIdRaw);
  return data.find((h) => h.number === num);
}

export async function searchBookData(bookIdRaw: string, query: string): Promise<Hadith[]> {
  const bookId = normalizeBookId(bookIdRaw);
  const lowerQ = query.toLowerCase();
  const idx = searchIndex.get(bookId);
  if (idx) return idx.filter((x) => x.text.includes(lowerQ)).map((x) => x.hadith);
  const data = await getBookData(bookIdRaw);
  ensureSearchIndex(bookId, data);
  const fresh = searchIndex.get(bookId)!;
  return fresh.filter((x) => x.text.includes(lowerQ)).map((x) => x.hadith);
}

export function clearCache() {
  cache.clear();
  hadithIndex.clear();
  searchIndex.clear();
}
