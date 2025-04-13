import { ensureDirSync } from "jsr:@std/fs";
import { cardsExportPath, setsExportPath } from "./lib.ts";
import { bulbapedia } from "./sources/bulbapedia/main.ts";

ensureDirSync(cardsExportPath);
ensureDirSync(setsExportPath);
switch (Deno.args[0]) {
  case "bulbapedia":
    await bulbapedia();
}
