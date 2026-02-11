import { retry } from "@std/async";
import { existsSync } from "@std/fs";
import { cardsCachePath, setsCachePath } from "../../lib.ts";
import { useCache } from "../../main.ts";

class ApiError extends Error {
  constructor(public url: URL, public response: string) {
    super();
  }
}

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
    parse?: { wikitext: string };
    error?: { code: string; info: string };
  };
  if (response && response.parse && response.parse.wikitext) {
    return response.parse.wikitext;
  } else {
    return new ApiError(url, JSON.stringify(response));
  }
}

/** get all pages in the category "Pokémon_Trading_Card_Game_Pocket_expansions" */
export async function* loadSets(): AsyncGenerator<string> {
  const url = new URL(bulbapediaApiUrl);
  url.searchParams.append("action", "query");
  url.searchParams.append("format", "json");
  url.searchParams.append("generator", "categorymembers");
  url.searchParams.append("gcmtitle", "Category:Pokémon_TCG_Pocket_expansions");
  url.searchParams.append("gcmprop", "title");
  url.searchParams.append("gcmnamespace", "0");
  url.searchParams.append("formatversion", "2");
  const pages: { title: string }[] = [];
  while (true) {
    const response = await retry(async () =>
      await (await fetch(url)).json()
    ) as {
      continue?: {
        gcmcontinue: string;
        continue: string;
      };
      query?: { pages: { title: string }[] };
    };
    if (response.query) pages.push(...response.query.pages);
    if (!response.continue) break;
    url.searchParams.set("gcmcontinue", response.continue.gcmcontinue);
    url.searchParams.set("continue", response.continue.continue);
  }
  for (const { title: page } of pages) {
    if (!page.endsWith(" (TCG Pocket)")) continue;
    const path = `${setsCachePath}/${page}.wikitext`;
    const log = `%cSet ${page}:`;
    if (useCache && existsSync(path)) {
      console.log(log, "color: yellow");
      yield Deno.readTextFileSync(path);
    } else {
      console.log(log, "color: green");
      const wikitext = await fetchWikitext(page);
      if (wikitext instanceof Error) continue;
      if (useCache) Deno.writeTextFileSync(path, wikitext);
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
    const log = `%cSet ${page}:`;
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
    const log = `| %cCard ${cardNumber}: ${cardName}`;
    if (useCache && existsSync(path)) {
      console.log(log, "color: yellow");
      yield [cardName, cardNumber, Deno.readTextFileSync(path)];
    } else {
      console.log(log, "color: green");
      const wikitext = await fetchWikitext(page);
      if (wikitext instanceof ApiError) {
        console.error(
          `| %cERROR on page "${page}"
  URL: ${wikitext.url}
  Response: ${wikitext.response}`,
          "color: red",
        );
        continue;
      }
      if (useCache) Deno.writeTextFileSync(path, wikitext);
      yield [cardName, cardNumber, wikitext];
    }
  }
}
