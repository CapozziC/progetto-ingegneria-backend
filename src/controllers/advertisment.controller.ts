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

const makePoint4326 = (lng: number, lat: number): Point => ({
  type: "Point",
  coordinates: [lng, lat],
});

const extToPhotoFormatEnum = (ext: string): PhotoFormat => {
  const e = ext.replace(".", "").toUpperCase();
  if (e === "JPG") return PhotoFormat.JPG;
  if (e === "JPEG") return PhotoFormat.JPEG;
  if (e === "PNG") return PhotoFormat.PNG;
  if (e === "HEIC") return PhotoFormat.HEIC;
  return PhotoFormat.JPG;
};

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
    const re = new RealEstate();
    re.size = body.realEstate.size;
    re.rooms = body.realEstate.rooms;
    re.floor = body.realEstate.floor;

    re.elevator = body.realEstate.elevator;
    re.airConditioning = body.realEstate.airConditioning;
    re.heating = body.realEstate.heating;
    re.concierge = body.realEstate.concierge;
    re.parking = body.realEstate.parking;
    re.garage = body.realEstate.garage;
    re.furnished = body.realEstate.furnished;
    re.solarPanels = body.realEstate.solarPanels;
    re.balcony = body.realEstate.balcony;
    re.terrace = body.realEstate.terrace;
    re.garden = body.realEstate.garden;

    re.energyClass = body.realEstate.energyClass;
    re.housingType = body.realEstate.housingType;

    re.location = makePoint4326(
      body.realEstate.location.lng,
      body.realEstate.location.lat,
    );

    const savedRealEstate = await queryRunner.manager.save(RealEstate, re);

    /**
     * ADVERTISEMENT
     */
    const adv = new Advertisement();
    adv.description = body.description;
    adv.price = body.price;
    adv.type = body.type;
    adv.status = body.status;

    adv.agent = { id: agentId } as Agent;
    adv.realEstate = savedRealEstate;

    const savedAdv = await queryRunner.manager.save(Advertisement, adv);

    /**
     * PHOTOS
     */
    const photoEntities = files.map((f, idx) => {
      const p = new Photo();
      p.advertisementId = savedAdv.id;
      p.url = `${baseUrl}/uploads/${f.filename}`;
      p.format = extToPhotoFormatEnum(path.extname(f.originalname));
      p.position = idx;
      return p;
    });

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

