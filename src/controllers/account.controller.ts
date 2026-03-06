import type { Response } from "express";
import { RequestAccount } from "../types/express.js";
import { requireAccount } from "../utils/require.utils.js";
import { findAdvertisements } from "../repositories/advertisement.repository.js";
import { getClientIp, normalizeIp } from "../utils/ip.utils.js";
import { geopifyIpGeolocate } from "../services/ip.service.js";
import { forwardGeocodeAddress } from "../services/geocode.service.js";
import { deleteAccountById } from "../repositories/account.repository.js";

export const getAllAdvertisements = async (
  req: RequestAccount,
  res: Response,
) => {
  const account = requireAccount(req, res);
  if (!account) return res.status(401).json({ error: "Unauthorized" });

  const take = Number(req.query.take ?? 20);
  const skip = Number(req.query.skip ?? 0);

  const status =
    typeof req.query.status === "string" ? req.query.status.trim() : undefined;

  const type =
    typeof req.query.type === "string" ? req.query.type.trim() : undefined;
  
  const housingType =
  typeof req.query.housingType === "string"
    ? req.query.housingType.trim()
    : undefined;

  const city =
    typeof req.query.city === "string" ? req.query.city.trim() : undefined;

  const qLat = typeof req.query.lat === "string" ? Number(req.query.lat) : NaN;
  const qLon = typeof req.query.lon === "string" ? Number(req.query.lon) : NaN;

  const radiusMeters =
    typeof req.query.radiusMeters === "string"
      ? Number(req.query.radiusMeters)
      : 10_000;

  const minPrice =
    typeof req.query.minPrice === "string"
      ? Number(req.query.minPrice)
      : undefined;

  const maxPrice =
    typeof req.query.maxPrice === "string"
      ? Number(req.query.maxPrice)
      : undefined;

  const minSize =
    typeof req.query.minSize === "string"
      ? Number(req.query.minSize)
      : undefined;

  const maxSize =
    typeof req.query.maxSize === "string"
      ? Number(req.query.maxSize)
      : undefined;

  const rooms =
    typeof req.query.rooms === "string" ? Number(req.query.rooms) : undefined;

  const floor =
    typeof req.query.floor === "string" ? Number(req.query.floor) : undefined;

  const parseBooleanQueryParam = (value: unknown): boolean | undefined => {
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  };

  const elevator = parseBooleanQueryParam(req.query.elevator);
  const airConditioning = parseBooleanQueryParam(req.query.airConditioning);
  const heating = parseBooleanQueryParam(req.query.heating);
  const concierge = parseBooleanQueryParam(req.query.concierge);
  const parking = parseBooleanQueryParam(req.query.parking);
  const garage = parseBooleanQueryParam(req.query.garage);
  const furnished = parseBooleanQueryParam(req.query.furnished);
  const solarPanels = parseBooleanQueryParam(req.query.solarPanels);
  const balcony = parseBooleanQueryParam(req.query.balcony);
  const terrace = parseBooleanQueryParam(req.query.terrace);
  const garden = parseBooleanQueryParam(req.query.garden);

  let lat: number | undefined;
  let lon: number | undefined;
  let mode: "coords" | "city" | "ip" | "none" = "none";
  let locationInfo:
    | { lat: number; lon: number }
    | {
        query: string;
        formatted: string;
        placeId: string;
        lat: number;
        lon: number;
      }
    | { ip: string; city?: string; country?: string; lat: number; lon: number }
    | null = null;

  if (Number.isFinite(qLat) && Number.isFinite(qLon)) {
    lat = qLat;
    lon = qLon;
    mode = "coords";
    locationInfo = { lat, lon };
  } else if (city) {
    const g = await forwardGeocodeAddress(city);
    if (!g) {
      return res.status(400).json({ error: "Could not geocode city" });
    }

    lat = g.lat;
    lon = g.lng;
    mode = "city";
    locationInfo = {
      query: city,
      formatted: g.formatted,
      placeId: g.placeId,
      lat,
      lon,
    };
  } else {
    const ipRaw = getClientIp(req);
    const ip = ipRaw ? normalizeIp(ipRaw) : null;

    console.log("cf-connecting-ip:", req.headers["cf-connecting-ip"]);
    console.log("x-forwarded-for:", req.headers["x-forwarded-for"]);
    console.log("req.ip:", req.ip);
    console.log("socket.remoteAddress:", req.socket.remoteAddress);

    if (ip && ip !== "127.0.0.1" && ip !== "::1") {
      try {
        const geo = await geopifyIpGeolocate(ip);

        if (geo.latitude != null && geo.longitude != null) {
          lat = geo.latitude;
          lon = geo.longitude;
          mode = "ip";
          locationInfo = {
            ip,
            city: geo.city ?? undefined,
            country: geo.country ?? undefined,
            lat,
            lon,
          };
        }
      } catch (e) {
        console.error("GEOAPIFY IP GEO ERROR:", e);
      }
    }
  }

  const result = await findAdvertisements({
    take: Number.isFinite(take) && take > 0 ? take : 20,
    skip: Number.isFinite(skip) && skip >= 0 ? skip : 0,
    status,
    type,
    housingType,
    lat,
    lon,
    radiusMeters:
      Number.isFinite(radiusMeters) && radiusMeters > 0 ? radiusMeters : 10_000,
    minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
    minSize: Number.isFinite(minSize) ? minSize : undefined,
    maxSize: Number.isFinite(maxSize) ? maxSize : undefined,
    rooms: Number.isFinite(rooms) ? rooms : undefined,
    floor: Number.isFinite(floor) ? floor : undefined,
    elevator,
    airConditioning,
    heating,
    concierge,
    parking,
    garage,
    furnished,
    solarPanels,
    balcony,
    terrace,
    garden,
  });

  return res.json({
    mode,
    location: locationInfo,
    ...result,
  });
};

export const deleteAccount = async (req: RequestAccount, res: Response) => {
  const account = requireAccount(req, res);
  if (!account) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const accountId = Number(req.params.id);
  if (!Number.isInteger(accountId)) {
    return res.status(400).json({ error: "Invalid account ID" });
  }
  try {
    if (account.id !== accountId) {
      return res.status(403).json({
        error: "Unauthorized,  only the account owner can delete their account",
      });
    }
    await deleteAccountById(account.id);
    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("deleteAccount error:", err);
    return res.status(500).json({ error: "Failed to delete account" });
  }
};
