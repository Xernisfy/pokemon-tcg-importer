import { Subtype, Supertype } from "../../types.ts";

/** regex to get metadata from set wikitext */
const setMetadataRegex = new RegExp(
  [
    /\|setname=(?<name>.*?)\n/,
    /[\s\S]*?\|setlogo=(?<id>.*?)\s/,
    /[\s\S]*?(?<=\|release=).*(?<releaseDate>[A-Z]\w+ \d+, \d+)/, // global release
    // /[\s\S]*?(?<=\|release=).*?(?<releaseDate>[A-Z]\w+ \d+, \d+)/, // new zealand release
    /([\s\S]*?\|cards=\d+ \((?<printedTotal>\d+))?/,
  ].map((r) => r.source).join(""),
);

/** get metadata from set wikitext */
export function getSetMetadata(wikitext: string) {
  const match = wikitext.match(setMetadataRegex);
  if (!match || !match.groups) {
    throw new Error("error while parsing set metadata");
  }
  const metadata = match.groups;
  metadata.idLong = "tcgp" + metadata.id.toLowerCase();
  metadata.regulationMark = metadata.id.replace(/^P/, "PROMO-");
  metadata.ptcgoCode = metadata.id.replace(/^P/, "PR-");
  return metadata as {
    name: string;
    id: string;
    idLong: string;
    releaseDate: string;
    printedTotal?: string;
    regulationMark: string;
    ptcgoCode: string;
  };
}

/** regex to get metadata from card wikitext
 * this boils down to (PokémonCard|TrainerCard)
 */
const cardMetadataRegex = new RegExp(
  "(" + [
    /\{\{TCG Card Infobox\/(?<supertype>Pokémon)\/Pocket\n/,
    /[\s\S]+?\|species=(?<species>.+)\n/,
    /\|type=(?<type>.+)\n/,
    /([\s\S]+?\|illustrator=(?<illustrator>[^\|]+)\n)?/,
    /[\s\S]*?\|hp=(?<hp>\d+)\n/,
    /(\|weakness=(?<weakness>.*?)\n)?/,
    /\|retreat cost=(?<retreatCost>.+)\n/,
    /(\|evo stage=(?<evoStage>.+)\n)?/,
    /([\s\S]*?\|prevo name=(?<prevoName>.+)\n)?/,
    /([\s\S]+?\{\{TCG Card Infobox\/Expansion Entry.+?\|rarity=(?<rarity>.+?)\|rarity count=(?<rarityCount>\d+).+\n)?/,
    /([\s\S]+?\|dex=(?<dex>.+)\n)?/,
    /([\s\S]+?\{\{Cardtext\/Pocket (?<ex>ex)\n)?/,
  ].map((r) => r.source).join("") + "|" + [
    /\{\{TCG Card Infobox\/(?<supertype>Trainer)\/Pocket\n/,
    /[\s\S]+?\|subtype=(?<subtype>.+)\n/,
    /([\s\S]*?\|illustrator=(?<illustrator>[^\|]+)\n)?/,
    /([\s\S]*?\|hp=(?<hp>\d+)\n)?/,
    /([\s\S]+?\{\{TCG Card Infobox\/Expansion Entry.+?\|rarity=(?<rarity>.+?)\|rarity count=(?<rarityCount>\d+).+\n)?/,
    /[\s\S]+?\{\{TCGTrainerText[\s\S]+?\|effect=(?<effect>.+)\n/,
  ].map((r) => r.source).join("") + ")",
);

/** regex for cards with multiple versions/rarities */
const cardVersionRegex =
  /\{\{TCG Card Infobox\/Tabbed Image\/Pocket\|image=.+?(?<cardNumber>\d+)\.png\|illustrator=(?<illustrator>.+)\|tab caption=(?<tabCaption>[\s\w]+\w).*?\}\}/g;

/** regex for abilities */
const cardAbilityRegex = new RegExp(
  [
    /\{\{Cardtext\/Ability(\/Pocket)?\n/,
    /\|type=(?<type>.+)\n/,
    /\|name=(?<name>.+)\n/,
    /[\s\S]+?\|effect=(?<effect>.+)\n/,
    /[\s\S]+?\n\}\}\n/,
  ].map((r) => r.source).join(""),
  "g",
);

/** regex for attacks */
const cardAttackRegex = new RegExp(
  [
    /\{\{Cardtext\/Attack(\/Pocket)?\n/,
    /[\s\S]+?\|cost=(?<cost>.+)\n/,
    /\|name=(?<name>.+)\n/,
    /([\s\S]+?\|damage=(?<damage>.*)\n)?/,
    /([\s\S]*?\|effect=(?<effect>.*)\n)?/,
    /[\s\S]*?\}\}\n/,
  ].map((r) => r.source).join(""),
  "g",
);

/** get metadata from card wikitext */
export function getCardMetadata(wikitext: string) {
  const match = wikitext.match(cardMetadataRegex);
  if (!match || !match.groups) {
    throw new Error("error while parsing card metadata");
  }
  const metadata: Record<string, string | RegExpExecArray["groups"][]> =
    match.groups;
  metadata.versions = wikitext.matchAll(cardVersionRegex)
    .map((a) => a.groups).toArray();
  if (metadata.supertype === Supertype.Pokemon) {
    metadata.abilities = wikitext.matchAll(cardAbilityRegex)
      .map((a) => a.groups).toArray();
    metadata.attacks = wikitext.matchAll(cardAttackRegex)
      .map((a) => a.groups).toArray();
  }
  return metadata as
    & ({
      supertype: Supertype.Pokemon;
      species: string;
      type: string;
      illustrator?: string;
      rarity?: string;
      rarityCount?: string;
      hp: string;
      weakness?: string;
      retreatCost: string;
      evoStage?: string;
      prevoName?: string;
      abilities: {
        type: string;
        name: string;
        effect: string;
      }[];
      attacks: {
        cost?: string;
        name: string;
        damage?: string;
        effect?: string;
      }[];
      dex?: string;
      ex?: "ex";
    } | {
      supertype: Supertype.Trainer;
      subtype: Subtype;
      illustrator?: string;
      rarity?: string;
      rarityCount?: string;
      hp?: string;
      effect: string;
    })
    & {
      versions: {
        cardNumber: string;
        illustrator: string;
        tabCaption: string;
      }[];
    };
}
