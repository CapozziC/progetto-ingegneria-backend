import type { Point } from "geojson";
import { Type as PoiType } from "../../entities/poi.js";
import { fetchJsonWithTimeout, HttpTimeoutError } from "../../utils/http.utils.js";

const GEOAPIFY_KEY = process.env.GEOAPIFY_API_KEY_PLACE;

type Feature = {
  geometry: { type: "Point"; coordinates: [number, number] }; // [lon, lat]
  properties: {
    place_id?: string;
    name?: string;
    categories?: string[];
    distance?: number;
  };
};

function mapCategoriesToType(categories?: string[]): PoiType | null {
  if (!categories?.length) return null;

  if (categories.some((c) => c.startsWith("education.school")))
    return PoiType.SCHOOL;

  if (categories.some((c) => c.startsWith("leisure.park"))) return PoiType.PARK;

  if (categories.some((c) => c.startsWith("public_transport")))
    return PoiType.PUBLIC_TRANSPORT;

  return null;
}

export async function fetchNearbyPois(params: {
  center: Point;
  radiusMeters: number;
  categories?: string;
  limit?: number;
  lang?: string;
}) {
  if (!GEOAPIFY_KEY) throw new Error("Missing GEOAPIFY_API_KEY env var");

  const [lon, lat] = params.center.coordinates as [number, number];

  // Clamp per evitare richieste “pesanti” (anche se qualcuno passa limit=5000)
  const limit = Math.max(1, Math.min(params.limit ?? 50, 50));
  const radiusMeters = Math.max(50, Math.min(params.radiusMeters, 5000));

  const searchParams = new URLSearchParams({
    apiKey: GEOAPIFY_KEY,
    categories:
      params.categories ?? "education.school,leisure.park,public_transport",
    filter: `circle:${lon},${lat},${radiusMeters}`,
    bias: `proximity:${lon},${lat}`,
    limit: String(limit),
    lang: params.lang ?? "it",
  });

  const url = `https://api.geoapify.com/v2/places?${searchParams.toString()}`;

  try {
    const r = await fetchJsonWithTimeout<{ features?: Feature[] }>(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      timeoutMs: 10_000,
    });

    if (!r.ok) {
      // NON buttare giù la richiesta principale: torna lista vuota (scelta anti-524)
      console.warn("[pois] Geoapify failed:", r.status, r.text ?? "");
      return [];
    }

    const features: Feature[] = r.json?.features ?? [];

    return features
      .map((f) => {
        const type = mapCategoriesToType(f.properties.categories);
        if (!type) return null;

        const [plon, plat] = f.geometry.coordinates;

        return {
          geoapifyPlaceId: f.properties.place_id ?? null,
          name: (f.properties.name ?? "POI").slice(0, 255),
          type,
          location: {
            type: "Point",
            coordinates: [plon, plat],
          } as Point,
          distance: f.properties.distance ?? null,
        };
      })
      .filter(
        (
          p,
        ): p is {
          geoapifyPlaceId: string | null;
          name: string;
          type: PoiType;
          location: Point;
          distance: number | null;
        } => Boolean(p),
      );
  } catch (e) {
    // anti-524: se va in timeout o errore rete, niente eccezione “fatale”
    if (e instanceof HttpTimeoutError) {
      console.warn("[pois] timeout");
      return [];
    }
    console.warn("[pois] error:", e);
    return [];
  }
}
