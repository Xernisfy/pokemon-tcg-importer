import { retry } from "jsr:@std/async";
import { existsSync } from "jsr:@std/fs";
import { cardsCachePath, setsCachePath } from "../../lib.ts";

const bulbapediaApiUrl = "https://bulbapedia.bulbagarden.net/w/api.php";

/** get wikitext for a page from MediaWiki API */
async function fetchWikitext(page: string) {
  const url = new URL(bulbapediaApiUrl);
  url.searchParams.append("action", "parse");
  url.searchParams.append("format", "json");
  url.searchParams.append("page", page.replace(" ", "_"));
  url.searchParams.append("prop", "wikitext");
  url.searchParams.append("redirects", "1");
  url.searchParams.append("formatversion", "2");
  const response = await retry(async () => await (await fetch(url)).json()) as {
    parse: { wikitext: string };
  };
  return response.parse.wikitext;
}

/** get all pages in the category "Pokémon_Trading_Card_Game_Pocket_expansions" */
export async function* loadSets(): AsyncGenerator<string> {
  const url = new URL(bulbapediaApiUrl);
  url.searchParams.append("action", "query");
  url.searchParams.append("format", "json");
  url.searchParams.append("generator", "categorymembers");
  url.searchParams.append(
    "gcmtitle",
    "Category:Pokémon_Trading_Card_Game_Pocket_expansions",
  );
  url.searchParams.append("gcmprop", "title");
  url.searchParams.append("gcmnamespace", "0");
  url.searchParams.append("formatversion", "2");
  const response = await retry(async () => await (await fetch(url)).json()) as {
    query: { pages: { title: string }[] };
  };
  for (const { title: page } of response.query.pages) {
    if (!page.endsWith(" (TCG Pocket)")) continue;
    const path = `${setsCachePath}/${page}.wikitext`;
    const log = `%cSet "${page}":`;
    if (existsSync(path)) {
      console.log(log, "color: yellow");
      yield Deno.readTextFileSync(path);
    } else {
      console.log(log, "color: green");
      const wikitext = await fetchWikitext(page);
      Deno.writeTextFileSync(path, wikitext);
      yield wikitext;
    }
  }
}

/** !!! DEVELOPMENT ONLY !!!
 * @deprecated use {@link loadSets}
 */
export async function* loadSetsOffline(): AsyncGenerator<string> {
  const response = {
    query: {
      pages: [
        { title: "Genetic Apex (TCG Pocket)" },
        { title: "Promo-A (TCG Pocket)" },
        { title: "Mythical Island (TCG Pocket)" },
        { title: "Space-Time Smackdown (TCG Pocket)" },
        { title: "Triumphant Light (TCG Pocket)" },
        { title: "Shining Revelry (TCG Pocket)" },
      ],
    },
  } as const;
  for (const { title: page } of response.query.pages) {
    const path = `${setsCachePath}/${page}.wikitext`;
    const log = `%cSet "${page}":`;
    console.log(log, "color: red");
    yield Deno.readTextFileSync(path);
  }
}
/** regex to find all cards in a set */
const setCardsRegex =
  /\|\| {{TCG ID\|(?:.*?)\|(?<cardName>.*?)\|(?<cardNumber>.*?)(?:\|.*?)?}}/gi;

/** get all cards in a set */
export async function* loadCards(
  setName: string,
  setWikitext: string,
): AsyncGenerator<[string, string, string]> {
  for (const match of setWikitext.matchAll(setCardsRegex)) {
    const { cardName, cardNumber } = match.groups!;
    const page = `${cardName} (${setName} ${cardNumber})`;
    const path = `${cardsCachePath}/${page}.wikitext`;
    const log = `| %cCard "${page}"`;
    if (existsSync(path)) {
      console.log(log, "color: yellow");
      yield [cardName, cardNumber, Deno.readTextFileSync(path)];
    } else {
      console.log(log, "color: green");
      const wikitext = await fetchWikitext(page);
      Deno.writeTextFileSync(path, wikitext);
      yield [cardName, cardNumber, wikitext];
    }
  }
}
