import { getBookData } from "./src/data.ts";
import { BOOKS } from "./src/types.ts";

for (const id of Object.keys(BOOKS)) {
  const data = getBookData(id);
  console.log(id, "->", data.length, "first number", data[0]?.number, "last", data[data.length-1]?.number);
  if (id === "riyadush-shalihin") {
    console.log("  sample 1 arab len", data[0].arab.length, "id len", data[0].id.length, "html?", !!data[0].html);
    console.log("  sample 7 arab snippet", data[6].arab.slice(0,100));
    console.log("  sample 7 id snippet", data[6].id.slice(0,200));
  }
}
// test alias
try {
  const alias = getBookData("riyadush-sholihin");
  console.log("alias riyadush-sholihin ->", alias.length, "ok");
} catch(e){ console.log("alias fail", e.message); }

// test assets/data for bukhari
import fs from "fs";
console.log("assets/data exists?", fs.existsSync("assets/data/bukhari.json"));
