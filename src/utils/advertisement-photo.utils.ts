import { Photo } from "../entities/photo.js";
import { QueryRunner } from "typeorm";
import path from "path";
import fs from "fs/promises";
import { extToPhotoFormatEnum } from "../utils/multer.utils.js";

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
