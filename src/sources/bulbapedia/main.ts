import { ensureDirSync } from "jsr:@std/fs";
import { cardsCachePath, setsCachePath } from "../../lib.ts";
import { Card, CardSet } from "../../types.ts";
import { loadCards, loadSets } from "./api.ts";
import { exportSets, formatCard, formatSet } from "./exporter.ts";
import { getCardMetadata, getSetMetadata } from "./lib.ts";

export async function bulbapedia() {
  ensureDirSync(setsCachePath);
  ensureDirSync(cardsCachePath);
  const sets: [CardSet, Card[]][] = [];
  for await (const setWikitext of loadSets()) {
    const set = getSetMetadata(setWikitext);
    const cards = [];
    for await (const loadedCard of loadCards(set.name, setWikitext)) {
      const [cardName, cardNumber, cardWikitext] = loadedCard;
      const card = getCardMetadata(cardWikitext);
      cards.push(formatCard(set, cardName, cardNumber, card));
    }
    sets.push([formatSet(set, cards.length), cards]);
  }
  await exportSets(sets);
}
