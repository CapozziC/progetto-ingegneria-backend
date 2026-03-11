import { RequestAccount } from "../types/express.js";
import { LocationInfo, LocationMode } from "../types/advertisement.type.js";
import { forwardGeocodeAddress } from "../services/geocode.service.js";
import { geopifyIpGeolocate } from "./ip.service.js";
import { getClientIp, normalizeIp } from "../utils/ip.utils.js";

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
