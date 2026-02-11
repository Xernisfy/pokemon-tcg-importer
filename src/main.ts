import { parseArgs } from "@std/cli";
import { ensureDirSync } from "@std/fs";
import { cardsExportPath, setsExportPath } from "./lib.ts";
import { bulbapedia } from "./sources/bulbapedia/main.ts";

const { cache, _: [source] } = parseArgs(Deno.args, {
  boolean: "cache",
  default: { cache: true },
  negatable: "cache",
});

export const useCache = cache;
ensureDirSync(cardsExportPath);
ensureDirSync(setsExportPath);
switch (source) {
  case "bulbapedia":
    await bulbapedia();
    break;
}
