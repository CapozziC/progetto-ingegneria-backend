import type { Response } from "express";
import { RequestAccount } from "../types/express.js";
import { findAdvertisements } from "../repositories/advertisement.repository.js";
import { getClientIp, normalizeIp } from "../utils/ip.utils.js";
import { requireAccount } from "../utils/require.utils.js";
import { deleteAccountById } from "../repositories/account.repository.js";
import { ipGeolocate } from "../services/ipGeolocation.service.js";
import { forwardGeocodeAddress } from "../services/geocode.service.js";

export const getAllAdvertisements = async (
  req: RequestAccount,
  res: Response,
) => {
  const account = requireAccount(req, res);
  if (!account) return res.status(401).json({ error: "Unauthorized" });

  const take = Number(req.query.take ?? 20);
  const skip = Number(req.query.skip ?? 0);
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined;
  const type = typeof req.query.type === "string" ? req.query.type : undefined;

  const city =
    typeof req.query.city === "string" ? req.query.city.trim() : undefined;

  const qLat = typeof req.query.lat === "string" ? Number(req.query.lat) : NaN;
  const qLon = typeof req.query.lon === "string" ? Number(req.query.lon) : NaN;

  const radiusMeters =
    typeof req.query.radiusMeters === "string"
      ? Number(req.query.radiusMeters)
      : 10_000;

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

  // 1) coords esplicite (GPS/mappa)
  if (Number.isFinite(qLat) && Number.isFinite(qLon)) {
    lat = qLat;
    lon = qLon;
    mode = "coords";
    locationInfo = { lat, lon };
  }
  // 2) città cercata (Geoapify geocode)
  else if (city) {
    const g = await forwardGeocodeAddress(city);
    if (!g) {
      return res.status(400).json({ error: "Could not geocode city" });
    }

    lat = g.lat;
    lon = g.lng; // attenzione: lng = lon

    mode = "city";
    locationInfo = {
      query: city,
      formatted: g.formatted,
      placeId: g.placeId,
      lat,
      lon,
    };
  }
  // 3) fallback IP (Geoapify ipinfo)
  else {
    const ipRaw = getClientIp(req);
    const ip = ipRaw ? normalizeIp(ipRaw) : null;

    if (ip && ip !== "127.0.0.1" && ip !== "::1") {
      try {
        const geo = await ipGeolocate(ip);
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
        console.error("IP GEO ERROR:", e);
      }
    }
  }

  // Query DB: se lat/lon non ci sono → fallback in repo (adv.id DESC)
  const result = await findAdvertisements({
    take,
    skip,
    status,
    type,
    lat,
    lon,
    radiusMeters: Number.isFinite(radiusMeters) ? radiusMeters : 10_000,
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
