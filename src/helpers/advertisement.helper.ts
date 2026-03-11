import { Photo } from "../entities/photo.js";
import { QueryRunner } from "typeorm";
import path from "path";
import fs from "fs/promises";
import { extToPhotoFormatEnum } from "../utils/multer.utils.js";

/**
 * Saves uploaded advertisement photos to the file system and creates corresponding Photo entities in the database. The function takes a QueryRunner for database operations, an array of uploaded files, the ID of the advertisement to which the photos belong, and the base URL for constructing photo URLs. It creates a directory for the advertisement's photos if it doesn't exist, moves each uploaded file to the appropriate location, and constructs a URL for each photo based on its new location. The function then creates Photo entities with the advertisement ID, URL, format, and position, and saves them to the database using the provided QueryRunner. Finally, it returns an array of the created Photo entities.
 * @param param0 - An object containing the QueryRunner for database operations, an array of uploaded files (Express.Multer.File[]), the ID of the advertisement (advertisementId) to which the photos belong, and the base URL (baseUrl) for constructing photo URLs.
 * @returns A promise that resolves to an array 
 *  of Photo entities that were created and saved to the database, each representing a photo associated with the specified advertisement.
 * @throws An error if the UPLOAD_DIR environment variable is not defined, or if there are issues with file operations or database interactions.
 */
export const saveAdvertisementPhotos = async ({
  queryRunner,
  files,
  advertisementId,
  baseUrl,
}: {
  queryRunner: QueryRunner;
  files: Express.Multer.File[];
  advertisementId: number;
  baseUrl: string;
}): Promise<Photo[]> => {
  const uploadDir = process.env.UPLOAD_DIR;

  if (!uploadDir) {
    throw new Error("UPLOAD_DIR environment variable is not defined");
  }

  const advPhotosDir = path.join(uploadDir, "photos", String(advertisementId));
  await fs.mkdir(advPhotosDir, { recursive: true });

  const photoEntities: Photo[] = [];

  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    if (!file) continue;

    const ext =
      path.extname(file.originalname).toLowerCase() ||
      path.extname(file.filename).toLowerCase() ||
      ".jpg";

    const newFilename = `${idx}${ext}`;
    const targetPath = path.join(advPhotosDir, newFilename);

    await fs.rename(file.path, targetPath);
    file.path = targetPath;

    photoEntities.push(
      Object.assign(new Photo(), {
        advertisementId,
        url: `${baseUrl}/uploads/photos/${advertisementId}/${newFilename}`,
        format: extToPhotoFormatEnum(ext),
        position: idx,
      }),
    );
  }

  if (photoEntities.length === 0) {
    return [];
  }

  return queryRunner.manager.save(Photo, photoEntities);
};
