export const exportPath = import.meta.dirname + "/cards/en";
export function loadImportConfig(): { sets: [string, string][] } {
  return JSON.parse(
    Deno.readTextFileSync(import.meta.dirname + "/import.config.json"),
  );
}
export function matchFirstGroup(
  wikitext: string,
  regex: RegExp,
): string | undefined {
  return wikitext.match(regex)?.[1];
}
