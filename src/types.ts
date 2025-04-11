import type { PokemonTCG } from "npm:pokemon-tcg-sdk-typescript";

// re-export
export type Ability = PokemonTCG.Ability;
export type Attack = PokemonTCG.Attack;
export type CardSet = PokemonTCG.Set;

// overrides
export type Card =
  & Pick<
    PokemonTCG.Card,
    | "id"
    | "name"
    //| "supertype"
    //| "subtypes"
    | "hp"
    //| "types"
    | "evolvesFrom"
    | "evolvesTo"
    | "rules"
    | "abilities"
    | "attacks"
    | "weaknesses"
    | "retreatCost"
    | "convertedRetreatCost"
    | "number"
    | "artist"
    //| "rarity"
    | "flavorText"
    | "nationalPokedexNumbers"
    | "images"
  >
  & {
    supertype: Supertype;
    subtypes: Subtype[];
    types: Type[];
    rarity: Rarity;
  };
export enum Rarity {
  Common = "Common", // 1 Diamond
  Uncommon = "Uncommon", // 2 Diamonds
  Rare = "Rare", // 3 Diamonds
  RareDouble = "Rare Double", // 4 Diamonds
  RareIllustration = "Rare Illustration", // 1 Star
  RareSuper = "Rare Super", // 2 Stars
  RareSpecialIllustration = "Rare Special Illustration", // 2 Stars
  Immersive = "Immersive", // 3 Stars
  RareUltra = "Rare Ultra", // 1 Crown
  ShinyRareDouble = "Shiny Rare Double", // 1 Sparkle
  ShinyRareSuper = "Shiny Rare Super", // 2 Sparkles
  Promo = "Promo", // Promo
}
export enum Supertype {
  Pokemon = "Pok\u00E9mon",
  Trainer = "Trainer",
}
export enum Subtype {
  Basic = "Basic",
  EX = "EX",
  Item = "Item",
  StageOne = "Stage 1",
  StageTwo = "Stage 2",
  Supporter = "Supporter",
}
export enum Type {
  Grass = "Grass",
  Fire = "Fire",
  Water = "Water",
  Lightning = "Lightning",
  Psychic = "Psychic",
  Fighting = "Fighting",
  Darkness = "Darkness",
  Metal = "Metal",
  Dragon = "Dragon",
  Colorless = "Colorless",
}

// custom
export type ImportConfig = {
  sets: {
    id: string;
    name: string;
    printedTotal?: number;
    releaseDate: string;
  }[];
};

export type SetCardList = {
  set: string;
  setId: string;
  printedTotal?: number;
  releaseDate: string;
  cards: { name: string; number: string; setIndex: string }[];
};
