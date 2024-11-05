export function loadImportConfig(): { sets: [string, string][] } {
  return JSON.parse(
    Deno.readTextFileSync(import.meta.dirname + "/import.config.json"),
  );
}
