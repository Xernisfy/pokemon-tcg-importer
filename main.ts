import { parseArgs } from "jsr:@std/cli";
import { bulbapedia } from "./sources/bulbapedia/lib.ts";

const { source } = parseArgs(Deno.args, {
  string: ["source"],
  alias: { s: "source" },
});

switch (source) {
  case "bulbapedia":
    await bulbapedia();
}
