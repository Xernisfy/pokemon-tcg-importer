import { ImportConfig } from "./types.ts";

export const exportCardsPath = "./out/cards/en";
export const exportSetsPath = "./out/sets";
export function loadImportConfig(): ImportConfig {
  return JSON.parse(Deno.readTextFileSync("./import.config.json"));
}
export function matchFirstGroup(
  wikitext: string,
  regex: RegExp,
): string | undefined {
  return wikitext.match(regex)?.[1];
}
const textEncoder = new TextEncoder();
export function reportProgress(message: string, i: number, max: number) {
  Deno.stdout.write(
    textEncoder.encode(
      `${message} ${i}/${max} (${Math.round((i / max) * 100)}%)        \r`,
    ),
  );
}
