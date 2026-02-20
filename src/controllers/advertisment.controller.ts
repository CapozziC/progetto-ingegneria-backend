import type { Response } from "express";
import path from "path";
import type { Point } from "geojson";
import { deleteUploadedFilesSafe } from "../controllers/upload.controller.js";
import {
  findAdvertisementOwnerId,
  deleteAdvertisementById,
} from "../repositories/advertisement.repository.js";
import { AppDataSource } from "../data-source.js";
import { Advertisement } from "../entities/advertisement.js";
import { RealEstate } from "../entities/realEstate.js";
import { Photo, Format as PhotoFormat } from "../entities/photo.js";
import { RequestAgent } from "../types/express.js";
import { Agent } from "../entities/agent.js";

/**
 *  Create a GeoJSON Point with SRID 4326 from longitude and latitude
 * @param lng longitude
 * @param lat latitude
 * @returns a GeoJSON Point with SRID 4326
 */
const makePoint4326 = (lng: number, lat: number): Point => ({
  type: "Point",
  coordinates: [lng, lat],
});

/**
 *  Convert file extension to PhotoFormat enum
 * @param ext file extension (e.g. ".jpg", ".png")
 * @returns corresponding PhotoFormat enum value (e.g. PhotoFormat.JPG, PhotoFormat.PNG)
 */
const extToPhotoFormatEnum = (ext: string): PhotoFormat => {
  const e = ext.replace(".", "").toUpperCase();
  if (e === "JPG") return PhotoFormat.JPG;
  if (e === "JPEG") return PhotoFormat.JPEG;
  if (e === "PNG") return PhotoFormat.PNG;
  if (e === "HEIC") return PhotoFormat.HEIC;
  return PhotoFormat.JPG;
};

/**
 *  Create an advertisement with its related real estate and photos in a single transaction
 * @param req RequestAgent with body containing advertisement data, real estate data and photos (already validated by Joi)
 * @param res Response with created advertisement, real estate and photos or error message
 * @returns JSON with created advertisement, real estate and photos or error message
 */
export const createAdvertisementWithRealEstateAndPhotosTx = async (
  req: RequestAgent,
  res: Response,
) => {
  const files = (req.files as Express.Multer.File[]) ?? [];
  //Controllo autenticazione
  if (!req.agent) {
    await deleteUploadedFilesSafe(files);
    return res.status(401).json({ error: "Unauthorized" });
  }

  const agentId = req.agent.id;

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const body = req.body; // già validato da Joi

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();

    /**
     * REAL ESTATE
     */
    const reDto = body.realEstate;
    const re = Object.assign(new RealEstate(), {
      size: reDto.size,
      rooms: reDto.rooms,
      floor: reDto.floor,
      elevator: reDto.elevator,
      airConditioning: reDto.airConditioning,
      heating: reDto.heating,
      concierge: reDto.concierge,
      parking: reDto.parking,
      garage: reDto.garage,
      furnished: reDto.furnished,
      solarPanels: reDto.solarPanels,
      balcony: reDto.balcony,
      terrace: reDto.terrace,
      garden: reDto.garden,
      energyClass: reDto.energyClass,
      housingType: reDto.housingType,
    });

    re.location = makePoint4326(reDto.location.lng, reDto.location.lat);

    const savedRealEstate = await queryRunner.manager.save(RealEstate, re);

    /**
     * ADVERTISEMENT
     */
    const adv = Object.assign(new Advertisement(), {
      description: body.description,
      price: body.price,
      type: body.type,
      status: body.status,
      agent: { id: agentId } as Agent,
      realEstate: savedRealEstate,
    });

    const savedAdv = await queryRunner.manager.save(Advertisement, adv);

    /**
     * PHOTOS
     */
    const photoEntities = files.map((f, idx) =>
      Object.assign(new Photo(), {
        advertisementId: savedAdv.id,
        // Assuming photos are served from /uploads/photos/ directory
        url: `${baseUrl}/uploads/photos/${f.filename}`,
        format: extToPhotoFormatEnum(path.extname(f.originalname)),
        position: idx,
      }),
    );

    const savedPhotos =
      photoEntities.length > 0
        ? await queryRunner.manager.save(Photo, photoEntities)
        : [];

    await queryRunner.commitTransaction();

    return res.status(201).json({
      advertisement: {
        id: savedAdv.id,
        description: savedAdv.description,
        price: savedAdv.price,
        type: savedAdv.type,
        status: savedAdv.status,
        agentId: savedAdv.agent.id,
        realEstateId: savedAdv.realEstate.id,
      },
      realEstate: savedRealEstate,
      photos: savedPhotos,
    });
  } catch {
    try {
      await queryRunner.rollbackTransaction();
    } catch {
      await deleteUploadedFilesSafe(files);

      return res.status(500).json({
        error: "Failed to create advertisement",
      });
    } finally {
      await queryRunner.release();
    }
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
    //Controllo autenticazione
    const agent = req.agent;
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

    await deleteAdvertisementById(advertisementId);

    return res
      .status(200)
      .json({ message: "Advertisement deleted successfully" });
  } catch (err) {
    console.error("deleteMyAdvertisement error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
