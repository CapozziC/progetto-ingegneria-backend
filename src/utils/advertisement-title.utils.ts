import { BuildAdvertisementTitleParams } from "../types/advertisement.type.js";

/**
 * Utility functions for building advertisement titles based on real estate details. This module provides functions to generate a descriptive title for an advertisement by combining information about the number of rooms, housing type, and address. The main function, buildAdvertisementTitle, takes an object containing the relevant details and constructs a title string that can be used in advertisement listings. The utility functions handle various cases, such as when certain details are missing or when there are specific numbers of rooms that have unique labels (e.g., "Monolocale" for 1 room). This module helps ensure that advertisement titles are consistently formatted and informative for potential clients.
 */
function getRoomsLabel(rooms?: number | null): string {
  if (!rooms || rooms <= 0) return "Immobile";

  if (rooms === 1) return "Monolocale";
  if (rooms === 2) return "Bilocale";
  if (rooms === 3) return "Trilocale";
  if (rooms === 4) return "Quadrilocale";
  if (rooms === 5) return "Pentalocale";

  return `${rooms} locali`;
}

/**
 *  Formats the housing type for an advertisement title. This function takes an optional housing type string and returns a formatted version of it. If the housing type is not provided, it defaults to "Immobile". The function uses a mapping to convert specific housing type values (e.g., "apartment", "villa") into more user-friendly labels ("Appartamento", "Villa"). If the provided housing type does not match any of the predefined types in the mapping, it returns the original housing type string. This function is used to ensure that the housing type is presented in a consistent and readable format in advertisement titles.
 * @param housingType An optional string representing the type of housing (e.g., "apartment", "villa"). This value is expected to be one of the predefined types or any other string that describes the housing type.
 * @returns A formatted string representing the housing type, such as "Appartamento" for "apartment", "Villa" for "villa", or the original string if it does not match any predefined types. If no housing type is provided, it returns "Immobile".
 */
function formatHousingType(housingType?: string | null): string {
  if (!housingType) return "Immobile";

  const map: Record<string, string> = {
    apartment: "Appartamento",
    villa: "Villa",
  };

  return map[housingType] ?? housingType;
}

/**
 * Extracts the street and city from a formatted address string. This function takes an optional formatted address string, splits it into parts based on commas, and returns a string that combines the street and city. The function handles cases where the formatted address may be missing or not contain the expected parts, ensuring that it returns a meaningful result even when some information is not available. This is useful for generating concise titles for advertisements that include key location details without overwhelming the title with too much information.
 * @param addressFormatted An optional string representing the formatted address, which is expected to contain the street and city separated by a comma (e.g., "Via Roma 1, Milano"). The function will attempt to extract the street and city from this string.
 * @returns A string that combines the street and city extracted from the formatted address. If the formatted address is not provided or does not contain the expected parts, it returns an empty string or a combination of available parts.
 */
function extractStreetAndCity(addressFormatted?: string | null): string {
  if (!addressFormatted) return "";

  const parts = addressFormatted
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "";

  const street = parts[0] ?? "";
  const city = parts[1] ?? "";

  return [street, city].filter(Boolean).join(", ");
}

export function buildAdvertisementTitle({
  rooms,
  addressFormatted,
  housingType,
}: BuildAdvertisementTitleParams): string {
  const roomsLabel = getRoomsLabel(rooms);
  const typeLabel = formatHousingType(housingType);
  const shortAddress = extractStreetAndCity(addressFormatted);

  if (shortAddress) {
    return `${roomsLabel} ${typeLabel} - ${shortAddress}`;
  }

  return `${roomsLabel} ${typeLabel}`;
}