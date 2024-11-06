import { fetchCards, fetchSets } from "./api.ts";
import { format } from "./exporter.ts";

export const setsPath = import.meta.dirname + "/import/sets";
export const wikiPath = import.meta.dirname + "/import/wikitexts";

export async function bulbapedia() {
  await fetchSets();
  await fetchCards();
  format();
}
