import { retry } from "@std/async";
import { exists } from "@std/fs";
import { cacheRedirectMap, cardsCachePath, setsCachePath } from "../../lib.ts";
import { useCache } from "../../main.ts";

class ApiError extends Error {
  constructor(public url: URL, public response: string) {
    super();
  }
}

const bulbapediaApiUrl = "https://bulbapedia.bulbagarden.net/w/api.php";

async function getRedirectMap(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await Deno.readTextFile(cacheRedirectMap));
  } catch {
    return {};
  }
}

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
  if (!response || !response.parse || !response.parse.wikitext) {
    return new ApiError(url, JSON.stringify(response));
  }
  return response.parse.wikitext;
}

async function cacheRedirects(page: string, wikitext: string) {
  const url = new URL(bulbapediaApiUrl);
  url.searchParams.append("action", "query");
  url.searchParams.append("format", "json");
  url.searchParams.append("prop", "redirects");
  url.searchParams.append("titles", page);
  url.searchParams.append("redirects", "1");
  url.searchParams.append("formatversion", "2");
  url.searchParams.append("rdprop", "title");
  const response = await retry(async () => await (await fetch(url)).json()) as {
    query: {
      pages: {
        title: string;
        redirects: {
          title: string;
        }[];
      }[];
    };
  };
  if (!response || !response.query || !response.query.pages) {
    return new ApiError(url, JSON.stringify(response));
  }
  const origin = response.query.pages[0];
  Deno.writeTextFile(`${cardsCachePath}/${origin.title}.wikitext`, wikitext);
  const redirects = await getRedirectMap();
  if (origin.redirects) {
    for (const { title } of origin.redirects) {
      redirects[title] = origin.title;
    }
  }
  Deno.writeTextFile(cacheRedirectMap, JSON.stringify(redirects));
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
    if (useCache && await exists(path)) {
      console.log(log, "color: yellow");
      yield await Deno.readTextFile(path);
    } else {
      console.log(log, "color: green");
      const wikitext = await fetchWikitext(page);
      if (wikitext instanceof Error) continue;
      if (useCache) await Deno.writeTextFile(path, wikitext);
      yield wikitext;
    }
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
    const log = `| %cCard ${cardNumber}: ${cardName}`;
    if (useCache) {
      const path = `${cardsCachePath}/${page}.wikitext`;
      if (await exists(path)) {
        console.log(log, "color: yellow");
        yield [cardName, cardNumber, await Deno.readTextFile(path)];
        continue;
      }
      const redirects = await getRedirectMap();
      if (redirects[page]) {
        console.log(log, "color: blue");
        const redirectPath = `${cardsCachePath}/${redirects[page]}.wikitext`;
        yield [cardName, cardNumber, await Deno.readTextFile(redirectPath)];
        continue;
      }
    }
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
    if (useCache) await cacheRedirects(page, wikitext);
    yield [cardName, cardNumber, wikitext];
  }
}
