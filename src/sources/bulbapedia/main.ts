import { ensureDirSync } from "@std/fs";
import { cardsCachePath, setsCachePath } from "../../lib.ts";
import { useCache } from "../../main.ts";
import { Card, CardSet } from "../../types.ts";
import { loadCards, loadSets } from "./api.ts";
import { exportSets, formatCard, formatSet } from "./exporter.ts";
import { getCardMetadata, getSetMetadata } from "./lib.ts";

export async function bulbapedia() {
  if (useCache) {
    ensureDirSync(setsCachePath);
    ensureDirSync(cardsCachePath);
  }
  const sets: [CardSet, Card[]][] = [];
  const errors: string[] = [];
  for await (const setWikitext of loadSets()) {
    const set = getSetMetadata(setWikitext);
    const cards = [];
    for await (const loadedCard of loadCards(set.name, setWikitext)) {
      const [cardName, cardNumber, cardWikitext] = loadedCard;
      try {
        const card = getCardMetadata(cardWikitext);
        cards.push(formatCard(set, cardName, cardNumber, card));
      } catch (e) {
        const log = `"${
          (e as Error).message
        }" on ${set.name} ${cardNumber} ${cardName}`;
        console.error(`| %c[ERR] ${log}`, "color: red");
        errors.push(log);
      }
    }
    sets.push([formatSet(set, cards.length), cards]);
  }
  await exportSets(sets);
  if (errors.length) console.error(errors);
}
