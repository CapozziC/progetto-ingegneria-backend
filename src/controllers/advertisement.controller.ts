import type { Response } from "express";
import { deleteUploadedFilesSafe } from "./upload.controller.js";
import {
  findAdvertisementOwnerId,
  deleteAdvertisementById,
} from "../repositories/advertisement.repository.js";
import { requireAgent } from "../middleware/require.middleware.js";
import { AppDataSource } from "../data-source.js";
import { Advertisement } from "../entities/advertisement.js";
import { RealEstate } from "../entities/realEstate.js";
import { RequestAgent } from "../types/express.js";
import {
  buildRealEstateEntity,
  buildAdvertisementEntity,
} from "../mappers/advertisement.mapper.js";
import { resolveRealEstateLocation } from "../services/realEstate.location.service.js";
import {
  saveAdvertisementPhotos,
  updateAdvertisementByAgent,
} from "../services/advertisement.service.js";
import {
  buildCreateAdvertisementResponse,
  buildUpdatedAdvertisementResponse,
} from "../mappers/advertisement.response.js";
import { attachNearbyPoisToAdvertisement } from "../services/advertisement.location.service.js";
import { parsePositiveInt } from "../utils/parse.utils.js";
import { replaceAdvertisementPhoto } from "../services/photo.service.js";

/**
 * Create an advertisement with its related real estate and photos in a single transaction
 * @param req RequestAgent with body containing advertisement data, real estate data and photos (already validated by Joi)
 * @param res Response with created advertisement, real estate and photos or error message
 * @returns JSON with created advertisement, real estate and photos or error message
 */
export const createAdvertisementWithRealEstateAndPhotosTx = async (
  req: RequestAgent,
  res: Response,
) => {
  const files = (req.files as Express.Multer.File[]) ?? [];

  if (!req.agent) {
    await deleteUploadedFilesSafe(files);
    return res.status(401).json({ error: "Unauthorized" });
  }

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();

    const agentId = req.agent.id;
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const body = req.body;

    const realEstate = buildRealEstateEntity(body.realEstate);
    await resolveRealEstateLocation(realEstate, body.realEstate);

    const savedRealEstate = await queryRunner.manager.save(
      RealEstate,
      realEstate,
    );

    const advertisement = buildAdvertisementEntity({
      body,
      agentId,
      realEstate: savedRealEstate,
    });

    const savedAdvertisement = await queryRunner.manager.save(
      Advertisement,
      advertisement,
    );

    await attachNearbyPoisToAdvertisement(
      queryRunner,
      savedAdvertisement,
      savedRealEstate,
    );

    const savedPhotos = await saveAdvertisementPhotos({
      queryRunner,
      files,
      advertisementId: savedAdvertisement.id,
      baseUrl,
    });

    await queryRunner.commitTransaction();

    return res.status(201).json(
      buildCreateAdvertisementResponse({
        advertisement: savedAdvertisement,
        realEstate: savedRealEstate,
        photos: savedPhotos,
      }),
    );
  } catch (err) {
    try {
      await queryRunner.rollbackTransaction();
    } catch (rollbackErr) {
      console.error("Error rolling back transaction:", rollbackErr);
    }

    await deleteUploadedFilesSafe(files);

    console.error("createAdvertisement error:", err);

    if (err instanceof Error && err.message === "ADDRESS_NOT_FOUND") {
      return res.status(400).json({ error: "Address not found / invalid" });
    }

    if (err instanceof Error && err.message === "LOCATION_REQUIRED") {
      return res.status(400).json({
        error:
          "Provide either realEstate.address/addressInput or realEstate.location {lat,lng}",
      });
    }

    return res.status(500).json({ error: "Failed to create advertisement" });
  } finally {
    try {
      await queryRunner.release();
    } catch (err) {
      console.error("Error releasing queryRunner:", err);
    }
  }
};

/**
 * Update an advertisement and its related real estate if it belongs to the authenticated agent, in a single transaction
 * @param req RequestAgent with body containing advertisement and real estate fields to update (already validated by Joi)
 * @param res Response with updated advertisement and real estate or error message
 * @returns JSON with updated advertisement and real estate or error message
 */
export const updateAgentAdvertisement = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    const agent = requireAgent(req, res);

    if (!agent) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const advertisementId = Number(req.params.id);
    if (Number.isNaN(advertisementId)) {
      return res.status(400).json({ error: "Invalid advertisement id" });
    }

    const updatedAdvertisement = await updateAdvertisementByAgent({
      advertisementId,
      agentId: agent.id,
      value: req.body,
    });

    return res
      .status(200)
      .json(buildUpdatedAdvertisementResponse(updatedAdvertisement));
  } catch (err) {
    if (err instanceof Error && err.message === "ADVERTISEMENT_NOT_FOUND") {
      return res.status(404).json({ error: "Advertisement not found" });
    }

    if (err instanceof Error && err.message === "REALESTATE_NOT_FOUND") {
      return res.status(400).json({ error: "Real estate data not found" });
    }

    if (err instanceof Error && err.message === "FORBIDDEN_ADVERTISEMENT") {
      return res.status(403).json({
        error: "Forbidden: you can update only your own advertisements",
      });
    }

    console.error("updateAgentAdvertisement error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
/**
 * Replace a photo of an advertisement if it belongs to the authenticated agent, in a single transaction
 * @param req RequestAgent with file containing the new photo and params containing advertisementId and photoId
 * @param res Response with updated photo or error message
 * @returns JSON with updated photo or error message
 */
export const replaceAgentAdvertisementPhotoAgent = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    const agent = requireAgent(req, res);
    if (!agent) return;

    const advertisementId = parsePositiveInt(req.params.advertisementId);
    const photoId = parsePositiveInt(req.params.photoId);

    if (!advertisementId || !photoId) {
      return res.status(400).json({
        error: "Invalid advertisementId or photoId",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "New photo file is required",
      });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const updatedPhoto = await replaceAdvertisementPhoto({
      agentId: agent.id,
      advertisementId,
      photoId,
      file: req.file,
      baseUrl,
    });

    return res.status(200).json({
      message: "Photo replaced successfully",
      photo: updatedPhoto,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADVERTISEMENT_NOT_FOUND") {
      return res.status(404).json({
        error: "Advertisement not found",
      });
    }

    if (error instanceof Error && error.message === "PHOTO_NOT_FOUND") {
      return res.status(404).json({
        error: "Photo not found",
      });
    }

    console.error(error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};
/**
 * Delete an advertisement if it belongs to the authenticated agent, in a single transaction also with its related real estate and photos
 * @param req RequestAgent
 * @param res Response
 * @returns JSON with success message or error
 */
export const deleteAgentAdvertisement = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    const agent = requireAgent(req, res);
    if (!agent) {
      return res
        .status(401)
        .json({ error: "Unauthorized: agent not logged in" });
    }

    const advertisementId = Number(req.params.id);
    if (!Number.isInteger(advertisementId) || advertisementId <= 0) {
      return res.status(400).json({ error: "Invalid advertisement id" });
    }

    const ownerId = await findAdvertisementOwnerId(advertisementId);

    if (!ownerId) {
      return res.status(404).json({ error: "Advertisement not found" });
    }

    if (ownerId !== agent.id) {
      return res.status(403).json({
        error: "Forbidden: you can delete only your own advertisements",
      });
    }

    const deleted = await deleteAdvertisementById(advertisementId);

    if (!deleted) {
      return res.status(404).json({ error: "Advertisement not found" });
    }

    return res.status(200).json({
      message: "Advertisement deleted successfully",
    });
  } catch (err) {
    console.error("deleteAgentAdvertisement error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
