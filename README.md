# pokemon-tcg-importer

Scrape online sources (Bulbapedia) for card data. For use with
PokemonTCG/pokemon-tcg-data

# Notes

Only used and tested so far with `Genetic Apex` and `Promo-A` from TCG-Pocket.

# Usage

### prerequisites

`Deno` from https://deno.com/

### 1. configure sets

import.config.json:

```json
{
  "sets": [
    ["Genetic Apex", "tcgp1"]
  ]
}
```

First value is the set name, second is its abbreviation

### 2. download cards

`deno run --allow-read --allow-net --allow-write main.ts --source bulbapedia`

### output

The result will be a JSON file per set in the `cards/en` folder, ready to be
copied to `PokemonTCG/pokemon-tcg-data`
