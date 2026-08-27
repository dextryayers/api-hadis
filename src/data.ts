import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Hadith } from "./types.js";
import { BOOKS, normalizeBookId } from "./types.js";

function findDir(candidates: string[]): string | null {
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function getAssetsDir(): string {
  const candidates = [
    path.join(process.cwd(), "assets"),
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "assets"),
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets"),
    path.join(process.cwd(), "assets"),
  ];
  return findDir(candidates) || candidates[0];
}

function getDataDir(): string {
  const assets = getAssetsDir();
  const candidates = [
    path.join(assets, "data"),
    path.join(process.cwd(), "assets", "data"),
    path.join(process.cwd(), "data"),
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", "data"),
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data"),
  ];
  const found = findDir(candidates);
  if (found) return found;
  // fallback to assets/data even if not exists yet (for error message)
  return path.join(assets, "data");
}

function getRiyadushDir(): string {
  const assets = getAssetsDir();
  const candidates = [
    path.join(assets, "riyadush-sholihin"),
    path.join(assets, "riyadush-shalihin"),
    path.join(assets, "riyadhus-shalihin"),
    path.join(process.cwd(), "assets", "riyadush-sholihin"),
    path.join(process.cwd(), "assets", "riyadush-shalihin"),
  ];
  const found = findDir(candidates);
  return found || path.join(assets, "riyadush-sholihin");
}

function getMusnadSyafiiDir(): string {
  const assets = getAssetsDir();
  const candidates = [
    path.join(assets, "musnad-syafii"),
    path.join(assets, "musnad-syafii"),
    path.join(process.cwd(), "assets", "musnad-syafii"),
    path.join(process.cwd(), "assets", "musnad-syafii"),
  ];
  const found = findDir(candidates);
  return found || path.join(assets, "musnad-syafii");
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

export function getBookData(bookIdRaw: string): Hadith[] {
  const bookId = normalizeBookId(bookIdRaw);
  const book = BOOKS[bookId];
  if (!book) throw new Error(`Book not found: ${bookIdRaw}`);

  if (cache.has(bookId)) return cache.get(bookId)!;

  // khusus Riyadhus Shalihin: gabung 3 file
  if (book.isRiyadush) {
    const riyadushDir = getRiyadushDir();
    if (!fs.existsSync(riyadushDir)) {
      throw new Error(`Riyadush dir not found: ${riyadushDir}`);
    }
    const files = ["1.json", "2.json", "3.json"];
    const all: Hadith[] = [];
    for (const f of files) {
      const fp = path.join(riyadushDir, f);
      if (!fs.existsSync(fp)) continue;
      const raw = fs.readFileSync(fp, "utf-8");
      const parsed = JSON.parse(raw) as Array<{ id: number; arab: string; terjemah: string }>;
      for (const item of parsed) {
        const arab = (item.arab || "").trim();
        const html = (item.terjemah || "").trim();
        const plain = stripHtml(html);
        all.push({
          number: item.id,
          arab,
          id: plain,
          html,
        });
      }
    }
    // sort by number
    all.sort((a, b) => a.number - b.number);
    cache.set(bookId, all);
    // juga cache alias
    cache.set(bookIdRaw, all);
    return all;
  }

  if (book.isMusnadSyafii) {
    const musnadDir = getMusnadSyafiiDir();
    if (!fs.existsSync(musnadDir)) {
      throw new Error(`Musnad Syafii dir not found: ${musnadDir}`);
    }
    const files = Array.from({ length: 12 }, (_, i) => `${i + 1}.json`);
    const all: Hadith[] = [];
    for (const f of files) {
      const fp = path.join(musnadDir, f);
      if (!fs.existsSync(fp)) continue;
      const raw = fs.readFileSync(fp, "utf-8");
      const parsed = JSON.parse(raw) as Array<{ id: number; arab: string; terjemah: string }>;
      for (const item of parsed) {
        const arab = (item.arab || "").trim();
        const html = (item.terjemah || "").trim();
        const plain = stripHtml(html);
        all.push({
          number: item.id,
          arab,
          id: plain,
          html,
        });
      }
    }
    all.sort((a, b) => a.number - b.number);
    cache.set(bookId, all);
    cache.set(bookIdRaw, all);
    return all;
  }

  // kitab biasa: load dari assets/data
  const dataDir = getDataDir();
  const filePath = path.join(dataDir, book.file);

  if (!fs.existsSync(filePath)) {
    // fallback coba di data/ langsung (legacy)
    const alt = path.join(process.cwd(), "data", book.file);
    if (fs.existsSync(alt)) {
      const raw = fs.readFileSync(alt, "utf-8");
      const parsed = JSON.parse(raw) as Hadith[];
      cache.set(bookId, parsed);
      return parsed;
    }
    throw new Error(`Data file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as Hadith[];
  cache.set(bookId, parsed);
  return parsed;
}

export function getHadithByNumber(bookIdRaw: string, number: number): Hadith | undefined {
  const data = getBookData(bookIdRaw);
  return data.find((h) => h.number === number);
}

export function clearCache() {
  cache.clear();
}
