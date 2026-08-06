import { encodeHex } from "jsr:@std/encoding/hex";

const textEncoder = new TextEncoder();

async function hashFile(path: string) {
  return encodeHex(
    await crypto.subtle.digest(
      "SHA-256",
      textEncoder.encode(await Deno.readTextFile(path)),
    ),
  );
}

const hashes: Record<string, string[]> = {};
const path = "./.cache/cards";
for await (const entry of Deno.readDir(path)) {
  if (entry.isFile) {
    const hash = await hashFile(`${path}/${entry.name}`);
    if (!hashes[hash]) hashes[hash] = [];
    hashes[hash].push(entry.name);
  }
}

let unique = 0;
let total = 0;

for (const hash in hashes) {
  unique++;
  total += hashes[hash].length;
  if (hashes[hash].length > 6) console.log(hashes[hash]);
}
console.log(`Found ${unique} unique hashes for ${total} cards`);
// Found 1777 unique hashes for 3041 cards
