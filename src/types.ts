export interface Hadith {
  number: number;
  arab: string;
  id: string;
}

export interface BookInfo {
  id: string;
  name: string;
  arabicName: string;
  available: number;
  file: string;
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
};

export const BOOK_IDS = Object.keys(BOOKS);
