import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ParibhashaEntry {
  hindi: string;
  hinglish: string;
  pageno: number;
  paribhasha: string[];
}

type ParibhashaData = Record<string, ParibhashaEntry>;

let paribhashaCache: ParibhashaData | null = null;

export async function loadParibhasha(): Promise<ParibhashaData> {
  if (paribhashaCache) {
    return paribhashaCache;
  }

  const paribhashaPath = join(__dirname, "paribhasha.json");
  const data = await readFile(paribhashaPath, "utf-8");
  paribhashaCache = JSON.parse(data) as ParibhashaData;
  return paribhashaCache;
}

export async function lookupWord(
  searchTerm: string
): Promise<ParibhashaEntry[]> {
  const data = await loadParibhasha();
  const searchLower = searchTerm.toLowerCase();
  const results: ParibhashaEntry[] = [];

  for (const [key, entry] of Object.entries(data)) {
    // Case-insensitive matching on key, hindi, or hinglish
    if (
      key.toLowerCase().includes(searchLower) ||
      entry.hindi.toLowerCase().includes(searchLower) ||
      entry.hinglish.toLowerCase().includes(searchLower)
    ) {
      results.push(entry);
    }
  }

  return results;
}
