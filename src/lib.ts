export const setsCachePath = ".cache/sets";
export const cardsCachePath = ".cache/cards";
export const setsExportPath = "out/sets";
export const cardsExportPath = "out/cards/en";

const releaseDateFormat = new Intl.DateTimeFormat([], {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});
/** format date to yyyy/mm/dd */
export function formatReleaseDate(
  date: Parameters<Intl.DateTimeFormat["formatToParts"]>[0],
) {
  const parts = new Map(
    releaseDateFormat.formatToParts(date).map((
      { type, value },
    ) => [type, value]),
  );
  return `${parts.get("year")}/${parts.get("month")}/${parts.get("day")}`;
}

const updatedAtFormat = new Intl.DateTimeFormat([], {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "UTC",
});
/** format date to yyyy/mm/dd hh:mm:ss */
export function formatUpdatedAtDate(
  date: Parameters<Intl.DateTimeFormat["formatToParts"]>[0],
): string {
  const parts = new Map(
    updatedAtFormat.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return `${parts.get("year")}/${parts.get("month")}/${parts.get("day")} ${
    parts.get("hour")
  }:${parts.get("minute")}:${parts.get("second")}`;
}

/** add image urls to set */
export function setImages(setId: string) {
  return {
    symbol: `https://images.pokemontcg.io/${setId}/symbol.png`,
    logo: `https://images.pokemontcg.io/${setId}/logo.png`,
  };
}

/** add image urls to card */
export function cardImages(setId: string, cardNumber: string) {
  return {
    small: `https://images.pokemontcg.io/${setId}/${cardNumber}.png`,
    large: `https://images.pokemontcg.io/${setId}/${cardNumber}_hires.png`,
  };
}

// various shared constants
export const RULE_EX =
  "ex rule: When your Pokémon ex is Knocked Out, your opponent gets 2 points.";
export const RULE_ITEM =
  "You may play any number of Item cards during your turn.";
export const RULE_SUPPORTER =
  "You may play only 1 Supporter card during your turn.";
export const WEAKNESS = "+20";
