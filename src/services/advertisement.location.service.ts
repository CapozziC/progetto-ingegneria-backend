import { RequestAccount } from "../types/express.js";
import { LocationInfo, LocationMode } from "../types/advertisement.type.js";
import { forwardGeocodeAddress } from "../services/geocode.service.js";
import { geopifyIpGeolocate } from "./ip.service.js";
import { getClientIp, normalizeIp } from "../utils/ip.utils.js";
import { Advertisement } from "../entities/advertisement.js";
import { Poi } from "../entities/poi.js";
import { QueryRunner } from "typeorm";
import { RealEstate } from "../entities/realEstate.js";
import { fetchNearbyPois } from "./places.service.js";

export const resolveAdvertisementLocation = async (
  req: RequestAccount,
  city?: string,
  qLat?: number,
  qLon?: number,
): Promise<{
  lat?: number;
  lon?: number;
  mode: LocationMode;
  locationInfo: LocationInfo;
}> => {
  if (Number.isFinite(qLat) && Number.isFinite(qLon)) {
    return {
      lat: qLat,
      lon: qLon,
      mode: "coords",
      locationInfo: { lat: qLat!, lon: qLon! },
    };
  }

  if (city) {
    const g = await forwardGeocodeAddress(city);

    if (!g) {
      throw new Error("Could not geocode city");
    }

    return {
      lat: g.lat,
      lon: g.lng,
      mode: "city",
      locationInfo: {
        query: city,
        formatted: g.formatted,
        placeId: g.placeId,
        lat: g.lat,
        lon: g.lng,
      },
    };
  }

  const ipRaw = getClientIp(req);
  const ip = ipRaw ? normalizeIp(ipRaw) : null;

  if (ip && ip !== "127.0.0.1" && ip !== "::1") {
    try {
      const geo = await geopifyIpGeolocate(ip);

      if (geo.latitude != null && geo.longitude != null) {
        return {
          lat: geo.latitude,
          lon: geo.longitude,
          mode: "ip",
          locationInfo: {
            ip,
            city: geo.city ?? undefined,
            country: geo.country ?? undefined,
            lat: geo.latitude,
            lon: geo.longitude,
          },
        };
      }
    } catch (e) {
      console.error("GEOAPIFY IP GEO ERROR:", e);
    }
  }

  return {
    lat: undefined,
    lon: undefined,
    mode: "none",
    locationInfo: null,
  };
};

export const attachNearbyPoisToAdvertisement = async (
  queryRunner: QueryRunner,
  advertisement: Advertisement,
  realEstate: RealEstate,
): Promise<void> => {
  try {
    const center = realEstate.location;

    const [schools, parks, transport] = await Promise.all([
      fetchNearbyPois({
        center,
        radiusMeters: 1500,
        categories: "education.school",
        limit: 3,
        lang: "it",
      }),
      fetchNearbyPois({
        center,
        radiusMeters: 2000,
        categories: "leisure.park",
        limit: 1,
        lang: "it",
      }),
      fetchNearbyPois({
        center,
        radiusMeters: 600,
        categories: "public_transport",
        limit: 3,
        lang: "it",
      }),
    ]);

    const nearby = [...schools, ...parks, ...transport];

    const nearbyValid = nearby.filter(
      (p) =>
        typeof p.geoapifyPlaceId === "string" && p.geoapifyPlaceId.length > 0,
    );

    if (nearbyValid.length === 0) {
      return;
    }

    const uniquePlaceIds = Array.from(
      new Set(nearbyValid.map((p) => p.geoapifyPlaceId as string)),
    );

    await queryRunner.manager.upsert(
      Poi,
      nearbyValid.map((p) => ({
        geoapifyPlaceId: p.geoapifyPlaceId as string,
        name: p.name,
        type: p.type,
        location: p.location,
      })),
      {
        conflictPaths: ["geoapifyPlaceId"],
        skipUpdateIfNoValuesChanged: true,
      },
    );

    const pois = await queryRunner.manager.find(Poi, {
      where: uniquePlaceIds.map((id) => ({ geoapifyPlaceId: id })),
    });

    if (pois.length === 0) {
      return;
    }

    advertisement.pois = pois;
    await queryRunner.manager.save(Advertisement, advertisement);
  } catch (poiErr) {
    console.error("Geoapify POI fetch/save failed:", poiErr);
  }
};