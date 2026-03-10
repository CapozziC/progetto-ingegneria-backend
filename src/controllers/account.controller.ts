import type { Response } from "express";
import { RequestAccount } from "../types/express.js";
import { requireAccount } from "../utils/require.utils.js";
import {
  findAdvertisementById,
  findAdvertisements,
} from "../repositories/advertisement.repository.js";
import { getClientIp, normalizeIp } from "../utils/ip.utils.js";
import { geopifyIpGeolocate } from "../services/ip.service.js";
import { forwardGeocodeAddress } from "../services/geocode.service.js";
import {
  deleteAccountById,
  findAccountById,
} from "../repositories/account.repository.js";
import {
  findAccountNegotiations,
  findAccountNegotiationDetail,
} from "../repositories/offer.repository.js";
import { buildAdvertisementTitle } from "../utils/advertisementTitle.utils.js";
import { parsePositiveInt } from "../utils/objectParse.utils.js";

export const getAccountProfile = async (req: RequestAccount, res: Response) => {
  const account = requireAccount(req, res);
  try {
    if (!account) return res.status(401).json({ error: "Unauthorized" });

    const fullAccount = await findAccountById(account.id);
    if (!fullAccount) {
      return res.status(404).json({ error: "Account not found" });
    }

    return res.json({
      id: fullAccount.id,
      firstName: fullAccount.firstName,
      lastName: fullAccount.lastName,
      email: fullAccount.email,
    });
  } catch (err) {
    console.error("getAccountProfile error:", err);
    return res
      .status(500)
      .json({ error: "Failed to retrieve account profile" });
  }
};

/**
 * Get a paginated list of advertisements, with optional filters for status, type, housingType,
 * city, geolocation (lat, lon, radiusMeters)
 * and real estate features (price range, size range,
 * rooms, floor, elevator, air conditioning, heating, concierge, parking, garage, furnished, solar panels, balcony, terrace and garden
 * If lat and lon are provided, they are used as the center of a circular geofence with radius defined by radiusMeters (default 100km) to filter advertisements.
 * If city is provided, it is geocoded and used as the center of the geofence. If both city and lat/lon are provided, lat/lon are used.
 * If neither city nor lat/lon are provided, an attempt is made to geolocate the user by IP
 * and use that as the center of the geofence. If geolocation by IP fails, no geofencing is applied.
 * @param req   RequestAccount with optional query parameters for pagination and filtering
 * @param res   Response with paginated list of advertisements matching the filters,
 * including a title built from rooms, address and housing type for each advertisement
 * @returns   JSON with paginated list of advertisements matching the filters,
 * including a title built from rooms, address and housing type for each advertisement
 * and information about the geolocation mode used (coords, city, ip, none) and the location info (coordinates or city name) if applicable
 * or error message in case of failure
 */
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
      : 200_000;

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

  const bathrooms =
    typeof req.query.bathrooms === "string"
      ? Number(req.query.bathrooms)
      : undefined;

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
      Number.isFinite(radiusMeters) && radiusMeters > 0
        ? radiusMeters
        : 200_000,
    minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
    minSize: Number.isFinite(minSize) ? minSize : undefined,
    maxSize: Number.isFinite(maxSize) ? maxSize : undefined,
    rooms: Number.isFinite(rooms) ? rooms : undefined,
    floor: Number.isFinite(floor) ? floor : undefined,
    bathrooms: Number.isFinite(bathrooms) ? bathrooms : undefined,
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
    items: result.items.map((adv) => ({
      ...adv,
      title: buildAdvertisementTitle({
        rooms: adv.realEstate?.rooms,
        addressFormatted: adv.realEstate?.addressFormatted,
        housingType: adv.realEstate?.housingType,
      }),
    })),
  });
};

/**
 * Get the list of negotiations for the authenticated account, with pagination.
 * @param req RequestAccount with authenticated account in req.account and optional query parameters for pagination (take, skip)
 * @param res Response with paginated list of negotiations for the authenticated account or error message
 * @returns JSON with paginated list of negotiations for the authenticated account or error message
 * Each negotiation includes the related advertisement with a title built from rooms, address and housing type
 * and the related agent information (id, name, email)
 * and the related account information (id, name, email)
 * and the negotiation details (id, status, createdAt, updatedAt)
 */

export const getAccountNegotiations = async (
  req: RequestAccount,
  res: Response,
) => {
  const account = requireAccount(req, res);
  if (!account) return res.status(401).json({ error: "Unauthorized" });

  const take = Number(req.query.take ?? 20);
  const skip = Number(req.query.skip ?? 0);

  try {
    const result = await findAccountNegotiations({
      accountId: account.id,
      take: Number.isFinite(take) && take > 0 ? take : 20,
      skip: Number.isFinite(skip) && skip >= 0 ? skip : 0,
    });

    return res.json(result);
  } catch (error) {
    console.error("Error fetching account negotiations:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch account negotiations" });
  }
};

/**
 * Get the negotiation details for the authenticated account for a specific advertisement and agent.
 * @param req RequestAccount with authenticated account in req.account, advertisementId and agentId in req.params
 * @param res Response with negotiation details for the specified advertisement and agent or error message
 * @returns JSON with negotiation details for the specified advertisement and agent or error message
 * The negotiation details include the related advertisement with a title built from rooms, address and housing type
 * and the related agent information (id, name, email)
 * and the related account information (id, name, email)
 * and the negotiation details (id, status, createdAt, updatedAt)
 */
export const getAccountNegotiationByAdvertisementAndAgent = async (
  req: RequestAccount,
  res: Response,
) => {
  const account = requireAccount(req, res);
  if (!account) return res.status(401).json({ error: "Unauthorized" });

  const advertisementId = parsePositiveInt(req.params.advertisementId);
  if (!advertisementId) {
    return res.status(400).json({ error: "Invalid advertisement id" });
  }

  const agentId = parsePositiveInt(req.params.agentId);
  if (!agentId) {
    return res.status(400).json({ error: "Invalid agent id" });
  }

  try {
    const negotiation = await findAccountNegotiationDetail({
      accountId: account.id,
      advertisementId,
      agentId,
    });

    if (!negotiation) {
      return res.status(404).json({ error: "Negotiation not found" });
    }

    return res.json(negotiation);
  } catch (error) {
    console.error("Error fetching account negotiation detail:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch account negotiation detail" });
  }
};

/**
 * Get the details of a specific advertisement by ID, including a title built from rooms,
 * address and housing type.
 * @param req RequestAccount with authenticated account in req.account and advertisementId in req.params
 * @param res Response with advertisement details including a title built from rooms, address and housing type or error message
 * @returns JSON with advertisement details including a title built from rooms, address and housing type or error message
 * The advertisement details include the related advertisement with a title built from rooms, address and housing type
 * and the related agent information (id, name, email)
 * and the related account information (id, name, email)
 * and the advertisement details (id, description, price, type, status, createdAt, updatedAt)
 */
export const getAdvertisementById = async (
  req: RequestAccount,
  res: Response,
) => {
  const account = requireAccount(req, res);
  if (!account) return res.status(401).json({ error: "Unauthorized" });
  const advertisementId = Number(req.params.advertisementId);
  if (!Number.isInteger(advertisementId)) {
    return res.status(400).json({ error: "Invalid advertisement ID" });
  }
  try {
    const advertisement = await findAdvertisementById(advertisementId);
    if (!advertisement) {
      return res.status(404).json({ error: "Advertisement not found" });
    }
    return res.json({
      ...advertisement,
      title: buildAdvertisementTitle({
        rooms: advertisement.realEstate?.rooms,
        addressFormatted: advertisement.realEstate?.addressFormatted,
        housingType: advertisement.realEstate?.housingType,
      }),
    });
  } catch (err) {
    console.error("getAdvertisementById error:", err);
    return res.status(500).json({ error: "Failed to retrieve advertisement" });
  }
};

/**
 * Delete the authenticated account by ID. Only the account owner can delete their account.
 * @param req RequestAccount with authenticated account in req.account and accountId in req.params
 * @param res Response with success message or error message
 * @returns JSON with success message or error message
 * Only the account owner can delete their account.
 */

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
