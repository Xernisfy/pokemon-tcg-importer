# pokemon-tcg-importer

Scrape online sources (e.g. Bulbapedia) for card data.

For use with
[PokemonTCG/pokemon-tcg-data](https://github.com/PokemonTCG/pokemon-tcg-data)

# Notes

Tested with Bulbapedia for "Genetic Apex" until "Shining Revelry"

# Usage

### prerequisites

`Deno` from https://deno.com/
<br/>OR<br/>
Docker

### download cards

`deno task bulbapedia`
<br/>OR<br/>
`.docker/build.sh && .docker/run.sh`

### output

- `out/cards/en/tcgp___.json`
  - one file per set, each containing all the cards of the set
  - these files are ready to be copied to `PokemonTCG/pokemon-tcg-data` directly
- `out/sets/en.json`
  - an array containing set metadata
  - the file is ready to be copied into the equally named file in
    `PokemonTCG/pokemon-tcg-data`
