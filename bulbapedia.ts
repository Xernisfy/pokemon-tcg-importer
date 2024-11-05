import { loadImportConfig } from "./tools.ts";
import {
  Ability,
  Attack,
  Card,
  SetCardList,
  Subtype,
  Supertype,
  Type,
} from "./types.ts";

const bulbapediaRoot = "https://bulbapedia.bulbagarden.net";
const importPath = import.meta.dirname + "/import";
async function fetchWikitext(page: string) {
  const url = new URL("/w/api.php", bulbapediaRoot);
  url.searchParams.append("action", "parse");
  url.searchParams.append("page", page.replace(" ", "_"));
  url.searchParams.append("prop", "wikitext");
  url.searchParams.append("format", "json");
  url.searchParams.append("redirects", "1");
  const response = await (await fetch(url)).json() as {
    parse: { wikitext: { "*": string } };
  };
  return response.parse.wikitext["*"];
}

switch (Deno.args[0]) {
  case "sets": {
    const sets = loadImportConfig().sets;
    for (const [set, setId] of sets) {
      const wikitext = await fetchWikitext(set + " (TCG Pocket)");
      const cardList: SetCardList = { set, setId, cards: [] };
      for (
        const { groups } of wikitext.matchAll(
          /setlist\/.*?entry\|(?<setIndex>.*?)\|{{TCG ID\|(?:.*?)\|(?<name>.*?)\|(?<number>.*?)(?:\|.*?)?}}/gi,
        )
      ) {
        if (!groups) continue;
        const { setIndex, name, number } = groups;
        cardList.cards.push({ name, number, setIndex });
      }
      Deno.mkdirSync(importPath + "/sets", { recursive: true });
      Deno.writeTextFileSync(
        importPath + "/sets/" + setId + ".json",
        JSON.stringify(cardList, null, 2),
      );
    }
    break;
  }
  case "cards": {
    for (
      const { name: setFileName } of Deno.readDirSync(importPath + "/sets")
    ) {
      const { set, setId, cards } = JSON.parse(
        Deno.readTextFileSync(importPath + "/sets/" + setFileName),
      ) as SetCardList;
      const setPath = importPath + "/wikitexts/" + setId;
      Deno.mkdirSync(setPath, { recursive: true });
      for (const { name, number } of cards) {
        const wikitext = await fetchWikitext(`${name} (${set} ${number})`);
        Deno.writeTextFileSync(setPath + "/" + number + ".txt", wikitext);
      }
    }
    break;
  }
  case "format": {
    for (
      const { name: setFileName } of Deno.readDirSync(importPath + "/sets")
    ) {
      const { setId, cards } = JSON.parse(
        Deno.readTextFileSync(importPath + "/sets/" + setFileName),
      ) as SetCardList;
      const importCards: Card[] = [];
      for (const { name, number } of cards) {
        const wikitext = Deno.readTextFileSync(
          importPath + "/wikitexts/" + setId + "/" + number + ".txt",
        );
        if (wikitext.startsWith("#REDIRECT")) {
          console.warn("TODO REDIRECT", number, name);
          continue;
        }
        const card: Partial<Card> = {};
        // id
        card.id = `${setId}-${number}`;
        // name
        card.name = name;
        // supertype
        card.supertype = wikitext.match(
          /\{\{TCG Card Infobox\/(?<supertype>.*?)\/Pocket/,
        )?.groups?.supertype as Supertype;
        // subtypes
        if (card.supertype === "Trainer") {
          card.subtypes = [
            wikitext.match(/\|subtype=(?<subtype>.*)/)?.groups
              ?.subtype as Subtype,
          ];
        } else {
          card.subtypes = [
            wikitext.match(/\|evo stage=(?<stage>.*)/)!.groups!
              .stage as Subtype,
          ];
          if (wikitext.match(/Cardtext\/Pocket ex/)) {
            card.subtypes.push(Subtype.EX);
          }
        }
        // hp
        const hp = wikitext.match(/\|hp=(?<hp>.*)/)?.groups?.hp;
        if (hp) card.hp = hp;
        // types
        const type = wikitext.match(/\|type=(?<type>.*)/)?.groups?.type;
        if (type) card.types = [type as Type];
        // evolvesFrom
        const prevo = wikitext.match(/\|prevo name=(?<prevo>.*)/)?.groups
          ?.prevo;
        if (prevo) card.evolvesFrom = prevo;
        // evolvesTo TODO
        // rules
        const rules = [];
        if (card.supertype === Supertype.Trainer) {
          const effect = wikitext.match(/\|effect=(?<effect>.*)/)?.groups
            ?.effect;
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
          const name = abilityWikitext.match(/\|name=(?<name>.*)/)?.groups
            ?.name!;
          const type = abilityWikitext.match(/\|type=(?<type>.*)/)?.groups
            ?.type!;
          const text =
            abilityWikitext.match(/\|effect=(?<effect>.*)/)?.groups?.effect
              .replaceAll(
                /\{\{.*?\|(.*?)}\}/g,
                (_substring, value) => value,
              ) || "";
          return {
            name,
            text,
            type,
          };
        });
        if (abilities.length) card.abilities = abilities;
        // attacks
        const attacks: Attack[] = [
          ...wikitext.matchAll(
            /\{\{Cardtext\/Attack\/Pocket(?<attack>[\s\S]*?)^\}\}/mg,
          ),
        ].map<Attack>((match) => {
          const attackWikitext = match.groups?.attack!;
          const name = attackWikitext.match(/\|name=(?<name>.*)/)?.groups
            ?.name!;
          const costString = attackWikitext.match(/\|cost=(?<cost>.*)/)?.groups
            ?.cost!;
          const cost = [...costString.matchAll(/\{\{.*?\|(?<type>.*?)}\}/g)]
            .map((m) => m.groups?.type!);
          const damage = attackWikitext.match(/\|damage=(?<damage>.*)/)?.groups
            ?.damage || "";
          const text =
            attackWikitext.match(/\|effect=(?<effect>.*)/)?.groups?.effect
              .replaceAll(
                /\{\{.*?\|(.*?)}\}/g,
                (_substring, value) => value,
              ) || "";
          return {
            name,
            cost,
            convertedEnergyCost: cost.length,
            damage,
            text,
          };
        });
        if (attacks.length) card.attacks = attacks;
        // weaknesses
        const weakness = wikitext.match(/\|weakness=(?<weakness>(.*))/)?.groups
          ?.weakness;
        if (weakness) card.weaknesses = [{ type: weakness, value: "+20" }];
        // retreatCost + convertedRetreatCost
        const retreatCost = wikitext.match(/\|retreat cost=(?<cost>.*)/)?.groups
          ?.cost;
        if (retreatCost) {
          card.convertedRetreatCost = parseInt(retreatCost);
          card.retreatCost = new Array(card.convertedRetreatCost).fill(
            Type.Colorless,
          );
        }
        // number
        card.number = number;
        // artist TODO
        // rarity TODO
        // flavorText
        const dex = wikitext.match(/\|dex=(?<dex>(.*))/)?.groups?.dex;
        if (dex) card.flavorText = dex;
        // nationalPokedexNumbers
        const ndex = wikitext.match(/|ndex=(?<ndex>.*)/)?.groups?.ndex;
        if (ndex) card.nationalPokedexNumbers = [parseInt(ndex)];
        // images
        card.images = {
          small: `https://images.pokemontcg.io/${setId}/${number}.png`,
          large: `https://images.pokemontcg.io/${setId}/${number}_hires.png`,
        };
        importCards.push(card as Card);
      }
      const importCardsPath = import.meta.dirname + "/cards/en/" + setId +
        ".json";
      Deno.writeTextFileSync(
        importCardsPath,
        JSON.stringify(importCards, null, 2),
      );
    }
    break;
  }
}
