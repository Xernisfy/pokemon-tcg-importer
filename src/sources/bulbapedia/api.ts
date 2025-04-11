import { retry } from "jsr:@std/async";
import { existsSync } from "jsr:@std/fs";
import { loadImportConfig, reportProgress } from "../../tools.ts";
import { SetCardList } from "../../types.ts";
import { setsPath, wikiPath } from "./lib.ts";

const bulbapediaRoot = "https://bulbapedia.bulbagarden.net";
async function fetchWikitext(page: string) {
  const url = new URL("/w/api.php", bulbapediaRoot);
  url.searchParams.append("action", "parse");
  url.searchParams.append("page", page.replace(" ", "_"));
  url.searchParams.append("prop", "wikitext");
  url.searchParams.append("format", "json");
  url.searchParams.append("redirects", "1");
  const response = await retry(async () => await (await fetch(url)).json()) as {
    parse: { wikitext: { "*": string } };
  };
  return response.parse.wikitext["*"];
}

export async function fetchSets() {
  const sets = loadImportConfig().sets;
  let i = 0;
  for (const { id: setId, name: set, printedTotal, releaseDate } of sets) {
    reportProgress("fetching set", ++i, sets.length);
    const wikitext = await fetchWikitext(set + " (TCG Pocket)");
    const cardList: SetCardList = {
      set,
      setId,
      printedTotal,
      releaseDate,
      cards: [],
    };
    for (
      const { groups } of wikitext.matchAll(
        /\|\| {{TCG ID\|(?:.*?)\|(?<name>.*?)\|(?<number>.*?)(?:\|.*?)?}}/gi,
      )
    ) {
      if (!groups) continue;
      const { setIndex, name, number } = groups;
      cardList.cards.push({ name, number, setIndex });
    }
    Deno.mkdirSync(setsPath, { recursive: true });
    Deno.writeTextFileSync(
      `${setsPath}/${setId}.json`,
      JSON.stringify(cardList, null, 2),
    );
  }
  console.log("\ndone");
}

export async function fetchCards() {
  for (
    const { name: setFileName } of Deno.readDirSync(setsPath)
  ) {
    const { set, setId, cards } = JSON.parse(
      Deno.readTextFileSync(`${setsPath}/${setFileName}`),
    ) as SetCardList;
    const setPath = `${wikiPath}/${setId}`;
    Deno.mkdirSync(setPath, { recursive: true });
    let i = 0;
    for (const { name, number } of cards) {
      reportProgress("fetching card", ++i, cards.length);
      const path = `${setPath}/${number}.txt`;
      if (!existsSync(path)) {
        Deno.writeTextFileSync(
          path,
          await fetchWikitext(`${name} (${set} ${number})`),
        );
      }
    }
  }
  console.log("\ndone");
}
