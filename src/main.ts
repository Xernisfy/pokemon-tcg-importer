import { bulbapedia } from "./sources/bulbapedia/lib.ts";

switch (Deno.args[0]) {
  case "bulbapedia":
    await bulbapedia();
}
