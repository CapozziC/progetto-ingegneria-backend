import { fetchJsonWithTimeout, HttpTimeoutError } from "../utils/http.utils.js";

type GeoapifyFeature = {
  properties: {
    lat: number;
    lon: number;
    formatted?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    postcode?: string;
    country?: string;
    place_id?: string;
  };
};

type GeoapifyResponse = {
  features?: GeoapifyFeature[];
};

export type GeocodeResult = {
  lat: number;
  lng: number;
  formatted: string;
  placeId: string;
};

export async function forwardGeocodeAddress(
  address: string,
): Promise<GeocodeResult | null> {
  const apiKey = process.env.GEOAPIFY_API_KEY_GEOCODE;
  if (!apiKey) throw new Error("GEOAPIFY_API_KEY_GEOCODE is not defined");

  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  url.searchParams.set("text", address);
  url.searchParams.set("limit", "1");
  url.searchParams.set("lang", "it");
  //lavori solo in Italia
  url.searchParams.set("filter", "countrycode:it");
  url.searchParams.set("apiKey", apiKey);

  try {
    const r = await fetchJsonWithTimeout<GeoapifyResponse>(url.toString(), {
      headers: { Accept: "application/json" },
      timeoutMs: 8_000,
    });

    if (!r.ok) {
      console.warn("[geocode] failed:", r.status, r.text ?? "");
      return null;
    }

    const f = r.json?.features?.[0];
    if (!f) return null;

    const { lat, lon, formatted, place_id } = f.properties;
    if (!place_id) return null;

    return {
      lat,
      lng: lon,
      formatted: formatted ?? address,
      placeId: place_id,
    };
  } catch (e) {
    if (e instanceof HttpTimeoutError) {
      console.warn("[geocode] timeout");
      return null;
    }
    console.warn("[geocode] error:", e);
    return null;
  }
}
