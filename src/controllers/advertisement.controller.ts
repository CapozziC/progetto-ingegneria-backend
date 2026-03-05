import type { Response } from "express";
import path from "path";
import type { Point } from "geojson";
import { forwardGeocodeAddress } from "../services/geocode.service.js";
import fs from "fs/promises";
import { deleteUploadedFilesSafe } from "./upload.controller.js";
import {
  findAdvertisementOwnerId,
  deleteAdvertisementById,
} from "../repositories/advertisement.repository.js";
import { requireAgent } from "../utils/require.utils.js";
import { AppDataSource } from "../data-source.js";
import { Advertisement } from "../entities/advertisement.js";
import { RealEstate } from "../entities/realEstate.js";
import { Photo, Format as PhotoFormat } from "../entities/photo.js";
import { RequestAgent } from "../types/express.js";
import { Agent } from "../entities/agent.js";
import { fetchNearbyPois } from "../services/places.service.js";
import { Poi } from "../entities/poi.js";

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

  if (!req.agent) {
    await deleteUploadedFilesSafe(files);
    return res.status(401).json({ error: "Unauthorized" });
  }

  const agentId = req.agent.id;
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const body = req.body;

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();

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
      addressInput: reDto.addressInput,
    });

    // usa addressInput come sorgente primaria se è quella che mandi dal FE
    const addressText =
      typeof reDto.address === "string" && reDto.address.trim()
        ? reDto.address.trim()
        : typeof reDto.addressInput === "string" && reDto.addressInput.trim()
          ? reDto.addressInput.trim()
          : "";

    if (addressText) {
      const geo = await forwardGeocodeAddress(addressText);
      if (!geo) {
        await queryRunner.rollbackTransaction();
        await deleteUploadedFilesSafe(files);
        return res.status(400).json({ error: "Address not found / invalid" });
      }
      re.addressFormatted = geo.formatted || addressText;
      re.placeId = geo.placeId;
      re.location = makePoint4326(geo.lng, geo.lat);
    } else if (reDto.location?.lng != null && reDto.location?.lat != null) {
      re.location = makePoint4326(reDto.location.lng, reDto.location.lat);
    } else {
      await queryRunner.rollbackTransaction();
      await deleteUploadedFilesSafe(files);
      return res.status(400).json({
        error:
          "Provide either realEstate.address/addressInput or realEstate.location {lat,lng}",
      });
    }

    const savedRealEstate = await queryRunner.manager.save(RealEstate, re);

    const adv = Object.assign(new Advertisement(), {
      description: body.description,
      price: body.price,
      type: body.type,
      status: body.status,
      agent: { id: agentId } as Agent,
      realEstate: savedRealEstate,
    });

    const savedAdv = await queryRunner.manager.save(Advertisement, adv);

    // -------------------------
    // POI: fetch + upsert
    // -------------------------
    try {
      const center = savedRealEstate.location;

      console.log("[POI] center =", center);

      console.time("[POI] fetchNearbyPois total");
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
      console.timeEnd("[POI] fetchNearbyPois total");

      console.log("[POI] schools =", schools);
      console.log("[POI] parks =", parks);
      console.log("[POI] transport =", transport);

      const nearby = [...schools, ...parks, ...transport];
      console.log("[POI] nearby.length =", nearby.length);
      console.log(
        "[POI] nearby sample =",
        nearby.slice(0, 3).map((p) => ({
          geoapifyPlaceId: p.geoapifyPlaceId,
          name: p.name,
          type: p.type,
          location: p.location,
        })),
      );

      const nearbyValid = nearby.filter(
        (p) =>
          typeof p.geoapifyPlaceId === "string" && p.geoapifyPlaceId.length > 0,
      );

      console.log("[POI] nearbyValid.length =", nearbyValid.length);
      if (nearbyValid.length === 0) {
        console.warn(
          "[POI] Nothing to upsert: all POIs missing geoapifyPlaceId. Check mapper from Geoapify response -> {geoapifyPlaceId}.",
        );
      }

      if (nearbyValid.length > 0) {
        // 🔥 controlla duplicati placeId (può confondere debug)
        const ids = nearbyValid.map((p) => p.geoapifyPlaceId as string);
        const uniqueIds = new Set(ids);
        console.log(
          "[POI] placeIds total/unique =",
          ids.length,
          uniqueIds.size,
        );

        // upsert su geoapifyPlaceId (richiede unique index)
        console.log("[POI] About to upsert Poi rows...");
        console.log(
          "[POI] upsert payload preview =",
          nearbyValid
            .map((p) => ({
              geoapifyPlaceId: p.geoapifyPlaceId,
              name: p.name,
              type: p.type,
              location: p.location,
            }))
            .slice(0, 3),
        );

        const upsertResult = await queryRunner.manager.upsert(
          Poi,
          nearbyValid
            .filter((p) => p.geoapifyPlaceId != null)
            .map((p) => ({
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

        // TypeORM: il result varia per driver, ma stampiamolo comunque
        console.log("[POI] upsertResult =", upsertResult);

        const placeIds = Array.from(uniqueIds);
        console.log("[POI] About to reload pois from DB, placeIds =", placeIds);

        // ⚠️ find con OR conditions
        const pois = await queryRunner.manager.find(Poi, {
          where: placeIds.map((id) => ({ geoapifyPlaceId: id })),
        });

        console.log("[POI] pois loaded from DB:", pois.length);
        console.log(
          "[POI] pois sample =",
          pois.slice(0, 3).map((p) => ({
            id: p.id,
            geoapifyPlaceId: p.geoapifyPlaceId,
            name: p.name,
            type: p.type,
          })),
        );

        if (pois.length > 0) {
          console.log("[POI] Attaching pois to advertisement", savedAdv.id);

          savedAdv.pois = pois;

          const advSaved = await queryRunner.manager.save(
            Advertisement,
            savedAdv,
          );

          console.log(
            "[POI] Advertisement saved with pois. advSaved.id =",
            advSaved.id,
          );

          // 🔥 verifica join: ricarica l'advertisement con relation
          const advCheck = await queryRunner.manager.findOne(Advertisement, {
            where: { id: savedAdv.id },
            relations: { pois: true },
          });

          console.log(
            "[POI] Post-save check: advCheck.pois.length =",
            advCheck?.pois?.length,
          );
        } else {
          console.warn(
            "[POI] After upsert, find returned 0 pois. Problem is in upsert or find(where).",
          );
        }
      }
    } catch (poiErr) {
      console.error("Geoapify POI fetch/save failed:", poiErr);
      // continua senza POI
    }
    // -------------------------
    //PHOTOS
    // -------------------------

    const uploadDir = process.env.UPLOAD_DIR;
    if (!uploadDir)
      throw new Error("UPLOAD_DIR environment variable is not defined");

    const advPhotosDir = path.join(uploadDir, "photos", String(savedAdv.id));
    await fs.mkdir(advPhotosDir, { recursive: true });

    const photoEntities: Photo[] = [];

    for (let idx = 0; idx < files.length; idx++) {
      const f = files[idx];
      if (!f) continue;

      const ext =
        path.extname(f.originalname).toLowerCase() ||
        path.extname(f.filename).toLowerCase() ||
        ".jpg";

      const newFilename = `${idx}${ext}`;
      const targetPath = path.join(advPhotosDir, newFilename);

      await fs.rename(f.path, targetPath);
      f.path = targetPath;

      photoEntities.push(
        Object.assign(new Photo(), {
          advertisementId: savedAdv.id,
          url: `${baseUrl}/uploads/photos/${savedAdv.id}/${newFilename}`,
          format: extToPhotoFormatEnum(ext),
          position: idx,
        }),
      );
    }

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
  } catch (err) {
    try {
      await queryRunner.rollbackTransaction();
    } catch (rollbackErr) {
      console.error("Error rolling back transaction:", rollbackErr);
    }
    await deleteUploadedFilesSafe(files);

    console.error("createAdvertisement error:", err);
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

    await deleteAdvertisementById(advertisementId);

    return res
      .status(200)
      .json({ message: "Advertisement deleted successfully" });
  } catch (err) {
    console.error("deleteMyAdvertisement error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
