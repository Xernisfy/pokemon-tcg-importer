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
const textEncoder = new TextEncoder();
export function reportProgress(message: string, i: number, max: number) {
  Deno.stdout.write(
    textEncoder.encode(
      `\r${message} ${i}/${max} (${Math.round((i / max) * 100)}%)`,
    ),
  );
}
