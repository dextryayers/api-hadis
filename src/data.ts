import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Hadith } from "./types.js";
import { BOOKS } from "./types.js";

// Resolve data directory - works both locally and on Vercel
// Vercel bundles with includeFiles, local is project root
function getDataDir(): string {
  // When running from dist/src, go up 2 levels; when from src, go up 1
  // Try multiple candidates
  const candidates = [
    path.join(process.cwd(), "data"),
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data"),
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

const cache = new Map<string, Hadith[]>();

export function getBookData(bookId: string): Hadith[] {
  const book = BOOKS[bookId];
  if (!book) throw new Error(`Book not found: ${bookId}`);

  if (cache.has(bookId)) return cache.get(bookId)!;

  const dataDir = getDataDir();
  const filePath = path.join(dataDir, book.file);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Data file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as Hadith[];
  cache.set(bookId, parsed);
  return parsed;
}

export function getHadithByNumber(bookId: string, number: number): Hadith | undefined {
  const data = getBookData(bookId);
  // number is 1-indexed but array may not be sorted strictly, search by field
  return data.find((h) => h.number === number);
}

export function clearCache() {
  cache.clear();
}
