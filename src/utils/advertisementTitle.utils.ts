type BuildAdvertisementTitleParams = {
  rooms?: number | null;
  street?: string | null;
  city?: string | null;
  housingType?: string | null;
  addressFormatted?: string | null;
};

function getRoomsLabel(rooms?: number | null): string {
  if (!rooms || rooms <= 0) return "Immobile";

  if (rooms === 1) return "Monolocale";
  if (rooms === 2) return "Bilocale";
  if (rooms === 3) return "Trilocale";
  if (rooms === 4) return "Quadrilocale";
  if (rooms === 5) return "Pentalocale";

  return `${rooms} locali`;
}

function formatHousingType(housingType?: string | null): string {
  if (!housingType) return "Immobile";

  const map: Record<string, string> = {
    apartment: "Appartamento",
    villa: "Villa",
  };

  return map[housingType] ?? housingType;
}

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