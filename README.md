# pokemon-tcg-importer

Scrape online sources (e.g. Bulbapedia) for card data.

For use with
[PokemonTCG/pokemon-tcg-data](https://github.com/PokemonTCG/pokemon-tcg-data)

# Notes

Tested with Bulbapedia for "Genetic Apex" until "Shining Revelry"

# Usage

### prerequisites

`Deno` from https://deno.com/
OR
Docker

### 1. configure sets

import.config.json:

```json
{
  "sets": [
    {
      "id": "A1",
      "name": "Genetic Apex",
      "printedTotal": 226,
      "releaseDate": "2024/10/30"
    },
    ...
  ]
}
```

First value is the set name, second is its abbreviation

### 2. download cards

`deno task bulbapedia`
OR
`.docker/build.sh && .docker/run.sh`

### output

- `out/cards/en/tcgp___.json`
  - one file per set, each containing all the cards of the set
  - these files are ready to be copied to `PokemonTCG/pokemon-tcg-data` directly
- `out/sets/en.json`
  - an array containing set metadata
  - the entries can be copied into the equally named file in `PokemonTCG/pokemon-tcg-data`

