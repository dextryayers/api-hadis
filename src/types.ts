export interface Hadith {
  number: number;
  arab: string;
  id: string;
  // untuk Riyadhus Shalihin: HTML asli
  html?: string;
}

export interface BookInfo {
  id: string;
  name: string;
  arabicName: string;
  available: number;
  file: string;
  // multi-file (riyadush 3 file, musnad syafii 12 file)
  isRiyadush?: boolean;
  isMusnadSyafii?: boolean;
}

export const BOOKS: Record<string, BookInfo> = {
  bukhari: { id: "bukhari", name: "Shahih Bukhari", arabicName: "صحيح البخاري", available: 6638, file: "bukhari.json" },
  muslim: { id: "muslim", name: "Shahih Muslim", arabicName: "صحيح مسلم", available: 4930, file: "muslim.json" },
  "abu-daud": { id: "abu-daud", name: "Sunan Abu Daud", arabicName: "سنن أبي داود", available: 4419, file: "abu-daud.json" },
  tirmidzi: { id: "tirmidzi", name: "Sunan Tirmidzi", arabicName: "جامع الترمذي", available: 3625, file: "tirmidzi.json" },
  nasai: { id: "nasai", name: "Sunan Nasa'i", arabicName: "سنن النسائي", available: 5364, file: "nasai.json" },
  "ibnu-majah": { id: "ibnu-majah", name: "Sunan Ibnu Majah", arabicName: "سنن ابن ماجه", available: 4285, file: "ibnu-majah.json" },
  ahmad: { id: "ahmad", name: "Musnad Ahmad", arabicName: "مسند أحمد", available: 4305, file: "ahmad.json" },
  darimi: { id: "darimi", name: "Sunan Darimi", arabicName: "سنن الدارمي", available: 2949, file: "darimi.json" },
  malik: { id: "malik", name: "Muwatta Malik", arabicName: "موطأ مالك", available: 1587, file: "malik.json" },
  "riyadush-shalihin": {
    id: "riyadush-shalihin",
    name: "Riyadhus Shalihin",
    arabicName: "رياض الصالحين",
    available: 372,
    file: "riyadush-shalihin",
    isRiyadush: true,
  },
  "musnad-syafii": {
    id: "musnad-syafii",
    name: "Musnad Syafii",
    arabicName: "مسند الشافعي",
    available: 1800,
    file: "musnad-syafii",
    isMusnadSyafii: true,
  },
};

export const BOOK_ALIASES: Record<string, string> = {
  "riyadush-sholihin": "riyadush-shalihin",
  "riyadhus-shalihin": "riyadush-shalihin",
  "riyadhus-sholihin": "riyadush-shalihin",
  "musnad-syafi'i": "musnad-syafii",
  "musnad-syafii": "musnad-syafii",
  "musnad-syafie": "musnad-syafii",
  "syafii": "musnad-syafii",
};

export function normalizeBookId(id: string): string {
  return BOOK_ALIASES[id] || id;
}

export const BOOK_IDS = Object.keys(BOOKS);
