import { parseArgs } from "@std/cli";
import { ensureDir } from "@std/fs";
import { cardsExportPath, setsExportPath } from "./lib.ts";
import { bulbapedia } from "./sources/bulbapedia/main.ts";

const { cache, _: [source] } = parseArgs(Deno.args, {
  boolean: "cache",
  default: { cache: true },
  negatable: "cache",
});

export const useCache = cache;
await ensureDir(cardsExportPath);
await ensureDir(setsExportPath);
switch (source) {
  case "bulbapedia":
    await bulbapedia();
    break;
}
