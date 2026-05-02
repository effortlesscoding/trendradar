import { readFile } from "node:fs/promises";
import { join } from "node:path";

const TMP_DIR = new URL("../../../tmp", import.meta.url).pathname;

export async function readRedditJson(date: string, reddit: string): Promise<object> {
  const file = join(TMP_DIR, date, `r_${reddit}.json`);
  const raw = await readFile(file, "utf-8");
  return JSON.parse(raw);
}
