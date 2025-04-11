import { fetchCards, fetchSets } from "./api.ts";
import { format } from "./exporter.ts";

export const setsPath = "./.cache/sets";
export const wikiPath = "./.cache/wikitexts";

export async function bulbapedia() {
  await fetchSets();
  await fetchCards();
  format();
}
