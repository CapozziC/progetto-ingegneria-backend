import type { Point } from "geojson";
import { Type as PoiType } from "../entities/poi.js";

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
  if (!GEOAPIFY_KEY) {
    throw new Error("Missing GEOAPIFY_API_KEY env var");
  }

  const [lon, lat] = params.center.coordinates as [number, number];

  const searchParams = new URLSearchParams({
    apiKey: GEOAPIFY_KEY,
    categories:
      params.categories ?? "education.school,leisure.park,public_transport",
    filter: `circle:${lon},${lat},${params.radiusMeters}`,
    bias: `proximity:${lon},${lat}`,
    limit: String(params.limit ?? 50),
    lang: params.lang ?? "it",
  });

  const url = `https://api.geoapify.com/v2/places?${searchParams.toString()}`;

  const response = await fetch(url, {
    method: "GET",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Geoapify request failed: ${response.status} ${response.statusText} - ${text}`,
    );
  }

  const data = (await response.json()) as { features?: Feature[] };
  const features: Feature[] = data?.features ?? [];

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
}
