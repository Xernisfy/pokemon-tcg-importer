import {
  cardImages,
  cardsExportPath,
  formatReleaseDate,
  formatUpdatedAtDate,
  RULE_EX,
  RULE_ITEM,
  RULE_SUPPORTER,
  setImages,
  setsExportPath,
  WEAKNESS,
} from "../../lib.ts";
import {
  Card,
  CardSet,
  Rarity,
  Subtype,
  Supertype,
  Type,
} from "../../types.ts";
import { getCardMetadata, getSetMetadata } from "./lib.ts";

/** used to store the possible evolution for all Pokémon
 * every new Pokémon creates an entry for itself
 * every Pokémon that has a previous evolution registers it and also registers itself as the next evolution for its previous evolutions
 * this is of course redundant, but makes the bi-directional relationship easier to track
 * Example:
 * - Pikachu card => creates new entry for "pikachu"
 * - Raichu card => creates new entry for "raichu" + "raichu" evolvesFrom "pikachu" + "pikachu" evolvesTo "raichu"
 */
const evolutions: Record<string, {
  evolvesFrom?: string;
  evolvesTo?: string[];
}> = {};

/** map Bulbapedia rarities to PokémonTCG rarities */
const rarityMap: Record<string, Rarity> = {
  "Double Rare": Rarity.RareDouble,
  "Illustration Rare": Rarity.RareIllustration,
  "Super Rare": Rarity.RareSuper,
  "Special Illustration Rare": Rarity.RareSpecialIllustration,
  "Ultra Rare": Rarity.RareUltra,
  "Shiny Rare": Rarity.RareShiny,
  "Shiny Super Rare": Rarity.RareSuperShiny,
};

/** map Pokémon TCG Pocket rarities to PokémonTCG rarities */
const rarityMarkMap: Record<string, Rarity> = {
  Diamond1: Rarity.Common,
  Diamond2: Rarity.Uncommon,
  Diamond3: Rarity.Rare,
};

/** map Bulbapedia wikitext to PokémonTCG format */
export function formatCard(
  set: ReturnType<typeof getSetMetadata>,
  cardName: string,
  cardNumber: string,
  card: ReturnType<typeof getCardMetadata>,
): Card {
  const subtypes: Subtype[] = [];
  const rules: string[] = [];
  if (card.supertype === Supertype.Pokemon) {
    subtypes.push(card.evoStage as Subtype || Subtype.Basic);
    if (card.ex) {
      subtypes.push(Subtype.EX);
      rules.push(RULE_EX);
    }
    if (!evolutions[card.species]) evolutions[card.species] = {};
    if (card.prevoName) {
      if (!evolutions[card.prevoName]) evolutions[card.prevoName] = {};
      evolutions[card.species].evolvesFrom = card.prevoName;
      if (!evolutions[card.prevoName].evolvesTo) {
        evolutions[card.prevoName].evolvesTo = [];
      }
      if (!evolutions[card.prevoName].evolvesTo!.includes(card.species)) {
        evolutions[card.prevoName].evolvesTo!.push(card.species);
      }
    }
  } else {
    if (card.subtype) subtypes.push(card.subtype);
    if (card.effect) {
      rules.push(
        card.effect
          .replace(/\{\{.+?\|(.+?)\}\}/g, "$1")
          .replaceAll("<br>", " "),
      );
    }
    if (card.subtype === Subtype.Item) rules.push(RULE_ITEM);
    if (card.subtype === Subtype.Supporter) rules.push(RULE_SUPPORTER);
  }
  return {
    id: set.idLong + "-" + cardNumber,
    name: cardName,
    supertype: card.supertype,
    subtypes,
    hp: card.hp,
    types: card.supertype === Supertype.Pokemon
      ? [card.type as Type]
      : undefined,
    get evolvesFrom() {
      if (card.supertype !== Supertype.Pokemon) return;
      return evolutions[card.species].evolvesFrom;
    },
    get evolvesTo() {
      if (card.supertype !== Supertype.Pokemon || card.ex) return;
      return evolutions[card.species].evolvesTo;
    },
    rules: rules.length ? rules : undefined,
    ...(card.supertype === "Pokémon"
      ? {
        abilities: card.abilities.length
          ? card.abilities.map((ability) => ({
            name: ability.name,
            text: ability.effect.replace(/\{\{.+?\|(.+?)\}\}/g, "$1"),
            type: ability.type,
          }))
          : undefined,
        attacks: card.attacks.length
          ? card.attacks.map((attack) => ({
            name: attack.name,
            ...(((cost) =>
              cost
                ? { cost, convertedEnergyCost: cost?.length }
                : { cost: [], convertedEnergyCost: 0 })(
                attack.cost && attack.cost?.match(/[A-Z]\w+/g),
              )),
            damage: attack.damage ?? "",
            text: attack.effect?.replace(/\{\{.+?\|(.+?)\}\}/g, "$1") ?? "",
          }))
          : undefined,
        weaknesses: card.weakness
          ? [{ type: card.weakness, value: WEAKNESS }]
          : undefined,
        ...(card.retreatCost
          ? ((r) => ({
            convertedRetreatCost: r,
            retreatCost: new Array(r).fill(Type.Colorless),
          }))(parseInt(card.retreatCost))
          : {}),
      }
      : {}),
    number: cardNumber,
    ...(((v) =>
      v
        ? {
          artist: v.illustrator,
          rarity: rarityMap[v.tabCaption] || v.tabCaption,
        }
        : {
          artist: card.illustrator,
          rarity: (card.rarity)
            ? (rarityMarkMap[card.rarity + card.rarityCount] ||
              card.rarity + card.rarityCount)
            : Rarity.Promo,
        })(card.versions.find((v) => v.cardNumber === cardNumber))),
    flavorText: card.supertype === Supertype.Pokemon ? card.dex : undefined,
    regulationMark: set.regulationMark,
    images: cardImages(set.idLong, cardNumber),
  };
}

/** map Bulbapedia wikitext to PokémonTCG format */
export function formatSet(
  set: ReturnType<typeof getSetMetadata>,
  total: number,
): CardSet {
  return {
    id: set.idLong,
    name: set.name,
    series: "TCG Pocket",
    printedTotal: set.printedTotal ? parseInt(set.printedTotal) : total,
    total,
    legalities: {},
    ptcgoCode: set.ptcgoCode,
    releaseDate: formatReleaseDate(new Date(set.releaseDate + " UTC")),
    updatedAt: formatUpdatedAtDate(new Date()),
    images: setImages(set.idLong),
  };
}

/** generate output files */
export async function exportSets(sets: [CardSet, Card[]][]) {
  const setFile: CardSet[] = await (await fetch(
    "https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/refs/heads/master/sets/en.json",
  )).json();
  setFile.forEach((set, i) =>
    set.series === "TCG Pocket" && setFile.splice(i, 1)
  );
  for (const [set, cards] of sets) {
    setFile.push(set);
    Deno.writeTextFileSync(
      cardsExportPath + "/" + set.id + ".json",
      JSON.stringify(cards, null, 2),
    );
  }
  setFile.sort((a, b) => a.releaseDate < b.releaseDate ? -1 : 1);
  Deno.writeTextFileSync(
    setsExportPath + "/en.json",
    JSON.stringify(setFile, null, 2),
  );
}
