import type { Response } from "express";
import { RequestAccount } from "../types/express.js";
import { requireAccount } from "../middleware/require.middleware.js";
import {
  findAdvertisementById,
  findAdvertisements,
} from "../repositories/advertisement.repository.js";
import {
  deleteAccountById,
  findAccountById,
  updateAccountPassword,
} from "../repositories/account.repository.js";
import {
  findAccountNegotiations,
  findAccountNegotiationDetail,
} from "../repositories/offer.repository.js";
import { buildAdvertisementTitle } from "../helpers/advertisement-title.helper.js";
import {
  parseAdvertisementFilters,
  parsePositiveInt,
  normalizePagination,
} from "../utils/parse.utils.js";
import { buildAdvertisementResponse } from "../mappers/advertisement.response.js";
import { resolveAdvertisementLocation } from "../services/advertisement.location.service.js";
import bcrypt from "bcryptjs";

/**
 *  Get the profile information of the authenticated account.
 * @param req  RequestAccount with authenticated account in req.account
 * @param res  Response with account profile information or error message
 * @returns   JSON with account profile information (id, firstName, lastName, email) or error message
 */
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
 * Get the list of advertisements with optional filters and pagination. The location for filtering can be determined based on query parameters (coordinates, city, or IP geolocation).
 * @param req RequestAccount with authenticated account in req.account and optional query parameters for filters and pagination (take, skip, status, type, housingType, city, qLat, qLon, radiusMeters, minPrice, maxPrice, minSize, maxSize, rooms, floor, bathrooms, elevator, airConditioning, heating, concierge, parking, garage, furnished, solarPanels, balcony, terrace, garden)
 * @param res Response with list of advertisements matching the filters and pagination or error message
 * @returns JSON with list of advertisements matching the filters and pagination or error message
 * Each advertisement includes a title built from rooms, address and housing type, and location information based on the provided filters (coordinates, city, or IP geolocation)
 */
export const getAllAdvertisements = async (
  req: RequestAccount,
  res: Response,
) => {
  try {
    const account = requireAccount(req, res);
    if (!account) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const filters = parseAdvertisementFilters(req);

    let location;
    try {
      location = await resolveAdvertisementLocation(
        req,
        filters.city,
        filters.qLat,
        filters.qLon,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Could not geocode city"
      ) {
        return res.status(400).json({ error: "Could not geocode city" });
      }

      throw error;
    }

    const result = await findAdvertisements({
      take: normalizePagination(filters.take, 10, 1),
      skip: normalizePagination(filters.skip, 0, 0),
      status: filters.status,
      type: filters.type,
      housingType: filters.housingType,
      lat: location.lat,
      lon: location.lon,
      radiusMeters: normalizePagination(filters.radiusMeters, 200_000, 1),
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minSize: filters.minSize,
      maxSize: filters.maxSize,
      rooms: filters.rooms,
      floor: filters.floor,
      bathrooms: filters.bathrooms,
      elevator: filters.elevator,
      airConditioning: filters.airConditioning,
      heating: filters.heating,
      concierge: filters.concierge,
      parking: filters.parking,
      garage: filters.garage,
      furnished: filters.furnished,
      solarPanels: filters.solarPanels,
      balcony: filters.balcony,
      terrace: filters.terrace,
      garden: filters.garden,
    });

    return res
      .status(200)
      .json(
        buildAdvertisementResponse(
          result,
          location.mode,
          location.locationInfo,
        ),
      );
  } catch (error) {
    console.error("GET ALL ADVERTISEMENTS ERROR:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
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

  const take = Number(req.query.take ?? 10);
  const skip = Number(req.query.skip ?? 0);

  try {
    const result = await findAccountNegotiations({
      accountId: account.id,
      take: Number.isFinite(take) && take > 0 ? take : 10,
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
 * Update the password of the authenticated account. Only the account owner can update their password.
 * @param req RequestAccount with authenticated account in req.account, accountId in req.params and currentPassword, newPassword and confirmPassword in req.body
 * @param res Response with success message or error message
 * @returns JSON with success message or error message
 * Only the account owner can update their password.
 * The current password must be correct, the new password must be at least 8 characters long and different from the current password, and the new password and confirm password must match.
 */
export const updatePasswordAccount = async (
  req: RequestAccount,
  res: Response,
) => {
  try {
    const account = requireAccount(req, res);
    if (!account) return;

    const accountId = Number(req.params.accountId);
    if (!Number.isInteger(accountId)) {
      return res.status(400).json({ error: "Invalid account ID" });
    }

    if (account.id !== accountId) {
      return res.status(403).json({
        error: "Forbidden: only the account owner can update their password",
      });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error:
          "Current password, new password and confirm password are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: "New password and confirm password do not match",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "New password must be at least 8 characters long",
      });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({
        error: "New password must be different from current password",
      });
    }

    const fullAccount = await findAccountById(account.id);
    if (!fullAccount || !fullAccount.password) {
      return res.status(404).json({
        error: "Account not found or password not set",
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      fullAccount.password,
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: "Current password is incorrect",
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await updateAccountPassword(fullAccount.id, hashedNewPassword);

    return res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("updatePasswordAccount error:", err);
    return res.status(500).json({
      error: "Failed to update password",
    });
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
  console.log("deleteAccount endpoint called");

  try {
    const account = requireAccount(req, res);
    console.log("Authenticated account:", account);
    if (!account) return;

    const rawAccountId = req.params.accountId;
    console.log("Raw accountId from params:", rawAccountId);
    const accountId = Number(rawAccountId);
    console.log("Parsed accountId:", accountId);

    if (!rawAccountId || !Number.isInteger(accountId)) {
      return res.status(400).json({ error: "Invalid account ID" });
    }
    console.log(
      "Comparing authenticated account id:",
      account.id,
      "with requested accountId:",
      accountId,
    );
    if (account.id !== accountId) {
      return res.status(403).json({
        error: "Unauthorized: only the account owner can delete their account",
      });
    }

    await deleteAccountById(account.id);

    return res.status(200).json({
      message: "Account deleted successfully",
    });
  } catch (err) {
    console.error("deleteAccount error:", err);
    return res.status(500).json({
      error: "Failed to delete account",
    });
  }
};
