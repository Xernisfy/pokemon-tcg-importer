import {
  exportCardsPath,
  exportSetsPath,
  matchFirstGroup,
  reportProgress,
} from "../../tools.ts";
import {
  Ability,
  Attack,
  Card,
  CardSet,
  Rarity,
  SetCardList,
  Subtype,
  Supertype,
  Type,
} from "../../types.ts";
import { setsPath, wikiPath } from "./lib.ts";

const rarityMap: Record<string, Rarity> = {
  "Double Rare": Rarity.RareDouble,
  "Illustration Rare": Rarity.RareIllustration,
  "Super Rare": Rarity.RareSuper,
  "Special Illustration Rare": Rarity.RareSpecialIllustration,
  "Ultra Rare": Rarity.RareUltra,
  "Shiny Rare": Rarity.ShinyRareDouble,
  "Shiny Super Rare": Rarity.ShinyRareSuper,
};
const rarityMarkMap: Record<string, Rarity> = {
  "Diamond": Rarity.Common,
  "Star": Rarity.RareIllustration,
};
const updatedAtFormat = new Intl.DateTimeFormat([], {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "UTC",
});
function formatDate(
  date: Parameters<Intl.DateTimeFormat["formatToParts"]>[0],
  format: Intl.DateTimeFormat,
): string {
  const map = new Map(
    format.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return `${map.get("year")}/${map.get("month")}/${map.get("day")} ${
    map.get("hour")
  }:${map.get("minute")}:${map.get("second")}`;
}

function getEvolutions(setId: string, cards: SetCardList["cards"]) {
  const evolutions: Record<string, { from?: string; to?: Set<string> }> = {};
  for (const { number } of cards) {
    const wikitext = Deno.readTextFileSync(
      `${wikiPath}/${setId}/${number}.txt`,
    );
    const species = matchFirstGroup(wikitext, /\|species=(.*)/);
    const prevoName = matchFirstGroup(wikitext, /\|prevo name=(.*)/);
    if (species && !evolutions[species]) evolutions[species] = {};
    if (prevoName && !evolutions[prevoName]) evolutions[prevoName] = {};
    if (species && prevoName) {
      evolutions[species].from = prevoName;
      if (!evolutions[prevoName].to) evolutions[prevoName].to = new Set();
      evolutions[prevoName].to.add(species);
    }
  }
  return evolutions;
}

export function format() {
  Deno.mkdirSync(exportCardsPath, { recursive: true });
  Deno.mkdirSync(exportSetsPath, { recursive: true });
  const sets: CardSet[] = [];
  for (
    const { name: setFileName } of Deno.readDirSync(setsPath)
  ) {
    const { setId, cards, set: setName, printedTotal, releaseDate } = JSON
      .parse(
        Deno.readTextFileSync(`${setsPath}/${setFileName}`),
      ) as SetCardList;
    const id = `tcgp` + setId.replace("PROMO", "P").toLowerCase();
    const set: CardSet = {
      id,
      name: setName,
      series: "TCG Pocket",
      printedTotal: printedTotal || cards.length,
      total: cards.length,
      legalities: {},
      ptcgoCode: setId,
      releaseDate,
      updatedAt: formatDate(new Date(), updatedAtFormat),
      images: {
        symbol: `https://images.pokemontcg.io/${id}/symbol.png`,
        logo: `https://images.pokemontcg.io/${id}/logo.png`,
      },
    };
    const evolutions = getEvolutions(setId, cards);
    const importCards: Card[] = [];
    let i = 0;
    for (const { name, number } of cards) {
      reportProgress("exporting card", ++i, cards.length);
      const wikitext = Deno.readTextFileSync(
        `${wikiPath}/${setId}/${number}.txt`,
      );
      const card: Partial<Card> = {};
      // id
      card.id = `${id}-${number}`;
      // name
      card.name = name;
      // supertype
      card.supertype = matchFirstGroup(
        wikitext,
        /\{\{TCG Card Infobox\/(.*?)\/Pocket/,
      ) as Supertype;
      // subtypes
      if (card.supertype === "Trainer") {
        card.subtypes = [
          matchFirstGroup(wikitext, /\|subtype=(.*)/) as Subtype,
        ];
      } else {
        card.subtypes = [
          matchFirstGroup(wikitext, /\|evo stage=(.*)/) as Subtype,
        ];
        if (wikitext.match(/Cardtext\/Pocket ex/)) {
          card.subtypes.push(Subtype.EX);
        }
      }
      // hp
      const hp = matchFirstGroup(wikitext, /\|hp=(.*)/);
      if (hp) card.hp = hp;
      // types
      const type = matchFirstGroup(wikitext, /\|type=(.*)/);
      if (type) card.types = [type as Type];
      // evolvesFrom + evolvesTo
      const species = matchFirstGroup(wikitext, /\|species=(.*)/);
      if (species) {
        const { from, to } = evolutions[species];
        if (from) card.evolvesFrom = from;
        if (to) card.evolvesTo = [...to.values()];
      }
      // rules
      const rules = [];
      if (card.supertype === Supertype.Trainer) {
        const effect = matchFirstGroup(wikitext, /\|effect=(.*)/);
        if (effect) {
          rules.push(
            effect.replaceAll(
              /\{\{.*?\|(.*?)}\}/g,
              (_substring, value) => value,
            ).replaceAll("<br>", " "),
          );
        }
      }
      if (card.subtypes.includes(Subtype.EX)) {
        rules.push(
          "ex rule: When your Pokémon ex is Knocked Out, your opponent gets 2 points.",
        );
      }
      if (card.subtypes.includes(Subtype.Item)) {
        rules.push(
          "You may play any number of Item cards during your turn.",
        );
      }
      if (card.subtypes.includes(Subtype.Supporter)) {
        rules.push(
          "You may play only 1 Supporter card during your turn.",
        );
      }
      if (rules.length) card.rules = rules;
      // abilities
      const abilities: Ability[] = [
        ...wikitext.matchAll(
          /\{\{Cardtext\/Ability\/Pocket(?<ability>[\s\S]*?)^\}\}/mg,
        ),
      ].map<Ability>((match) => {
        const abilityWikitext = match.groups?.ability!;
        const name = matchFirstGroup(abilityWikitext, /\|name=(.*)/)!;
        const type = matchFirstGroup(abilityWikitext, /\|type=(.*)/)!;
        const text =
          matchFirstGroup(abilityWikitext, /\|effect=(.*)/)?.replaceAll(
            /\{\{.*?\|(.*?)}\}/g,
            (_substring, value) => value,
          ) || "";
        return { name, text, type };
      });
      if (abilities.length) card.abilities = abilities;
      // attacks
      const attacks: Attack[] = [
        ...wikitext.matchAll(
          /\{\{Cardtext\/Attack\/Pocket(?<attack>[\s\S]*?)^\}\}/mg,
        ),
      ].map<Attack>((match) => {
        const attackWikitext = match.groups?.attack!;
        const name = matchFirstGroup(attackWikitext, /\|name=(.*)/)!;
        const costString = matchFirstGroup(attackWikitext, /\|cost=(.*)/)!;
        const cost = [...costString.matchAll(/\{\{.*?\|(?<type>.*?)}\}/g)]
          .map((m) => m.groups?.type!);
        const damage = matchFirstGroup(attackWikitext, /\|damage=(.*)/) || "";
        const text =
          matchFirstGroup(attackWikitext, /\|effect=(.*)/)?.replaceAll(
            /\{\{.*?\|(.*?)}\}/g,
            (_substring, value) => value,
          ) || "";
        return { name, cost, convertedEnergyCost: cost.length, damage, text };
      });
      if (attacks.length) card.attacks = attacks;
      // weaknesses
      const weakness = matchFirstGroup(wikitext, /\|weakness=(.*)/);
      if (weakness) card.weaknesses = [{ type: weakness, value: "+20" }];
      // retreatCost + convertedRetreatCost
      const retreatCost = matchFirstGroup(wikitext, /\|retreat cost=(.*)/);
      if (retreatCost) {
        card.convertedRetreatCost = parseInt(retreatCost);
        card.retreatCost = new Array(card.convertedRetreatCost).fill(
          Type.Colorless,
        );
      }
      // number
      card.number = number;
      // artist + rarity
      if (wikitext.match(/\|illustrator=/g)?.length === 1) {
        const illus = matchFirstGroup(wikitext, /\|illustrator=(.*)/);
        if (illus) card.artist = illus;
        // assume rarity based on rarity mark because it is not explicitly stated
        const rarity = matchFirstGroup(wikitext, /\|rarity=(.*?)\|/);
        if (rarity) card.rarity = rarityMarkMap[rarity];
      } else {
        const cardVersions = [
          ...wikitext.matchAll(
            /\{\{TCG Card Infobox\/Tabbed Image\/Pocket\|image=.+?(?<number>\d+).png\|illustrator=(?<illus>.*?)\|tab caption=(?<rarity>.*?)(?: \(|\}\})/g,
          ),
        ];
        const version = cardVersions.find((match) =>
          match.groups?.number === card.number
        );
        if (version) {
          const { illus, rarity } = version.groups!;
          card.artist = illus;
          if (rarity in Rarity) card.rarity = rarity as Rarity;
          else {
            const mappedRarity = rarityMap[rarity];
            if (mappedRarity) card.rarity = mappedRarity;
            else {
              console.warn(
                `%Rarity "${rarity}" for card ${setName} ${card.number} ${card.name} not found!`,
                "color: yellow",
              );
            }
          }
        } else {
          console.warn(
            `%cVersion for card ${setName} ${card.number} ${card.name} not found!`,
            "color: yellow",
          );
        }
      }
      // flavorText
      const dex = matchFirstGroup(wikitext, /\|dex=(.*)/);
      if (dex) card.flavorText = dex;
      // nationalPokedexNumbers
      const ndex = matchFirstGroup(wikitext, /|ndex=(.*)/);
      if (ndex) card.nationalPokedexNumbers = [parseInt(ndex)];
      // images
      card.images = {
        small: `https://images.pokemontcg.io/${id}/${number}.png`,
        large: `https://images.pokemontcg.io/${id}/${number}_hires.png`,
      };
      importCards.push(card as Card);
    }
    Deno.writeTextFileSync(
      `${exportCardsPath}/${id}.json`,
      JSON.stringify(importCards, null, 2),
    );
    sets.push(set);
  }
  Deno.writeTextFileSync(
    exportSetsPath + "/en.json",
    JSON.stringify(sets.sort((a, b) => a.id > b.id ? 1 : -1), null, 2),
  );
  console.log("\ndone");
}
