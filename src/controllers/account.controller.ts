import type { Response } from "express";
import { RequestAccount } from "../types/express.js";
import { findAdvertisements } from "../repositories/advertisement.repository.js";
import { getClientIp } from "../utils/ip.utils.js";
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

  // filtri “posizione”
  const city =
    typeof req.query.city === "string" ? req.query.city.trim() : undefined;

  const qLat = typeof req.query.lat === "string" ? Number(req.query.lat) : NaN;
  const qLon = typeof req.query.lon === "string" ? Number(req.query.lon) : NaN;

  let lat: number | undefined;
  let lon: number | undefined;
  let mode: "coords" | "city" | "ip" | "none" = "none";
  let locationInfo:
    | { lat: number; lon: number }
    | { city: string; lat: number; lon: number }
    | { ip: string; city?: string; country?: string; lat: number; lon: number }
    | null = null;

  // 1) coords esplicite (mappa/GPS)
  if (Number.isFinite(qLat) && Number.isFinite(qLon)) {
    lat = qLat;
    lon = qLon;
    mode = "coords";
    locationInfo = { lat, lon };
  }
  // 2) città cercata
  else if (city) {
    const g = await forwardGeocodeAddress(city);
    // qui sotto adatta ai nomi reali che ritorna la tua funzione:
    lat = g?.lat;
    lon = g?.lng;

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: "Could not geocode city" });
    }

    mode = "city";
    locationInfo = { city, lat: lat as number, lon: lon as number };
  }
  // 3) fallback IP
  else {
    const ip = getClientIp(req);
    if (ip) {
      const geo = await ipGeolocate(ip);
      if (geo.latitude != null && geo.longitude != null) {
        lat = geo.latitude;
        lon = geo.longitude;
        mode = "ip";
        locationInfo = { ip, city: geo.city, country: geo.country, lat, lon };
      }
    }
  }

  const result = await findAdvertisements({
    take,
    skip,
    status,
    type,
    // se lat/lon sono undefined → niente “nearby”, torna l’ordinamento classico
    lat,
    lon,
    radiusMeters: 10_000,
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
