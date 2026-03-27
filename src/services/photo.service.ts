import {
  extToFormatNoString,
  getRelativePathFromUrl,
} from "../helpers/file.helper.js";
import { ReplaceAdvertisementPhotoParams } from "../types/photo.type.js";
import { transactionFindPhotoByIdAndAdvertisementId,savePhoto } from "../repositories/photo.repository.js";
import { AppDataSource } from "../data-source.js";
import path from "node:path";
import fs from "node:fs/promises";
import { transactionFindAdvertisementAgentId } from "../repositories/advertisement.repository.js";

export async function replaceAdvertisementPhoto({
  agentId,
  advertisementId,
  photoId,
  file,
  baseUrl,
}: ReplaceAdvertisementPhotoParams) {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const advertisement = await transactionFindAdvertisementAgentId(
      queryRunner.manager,
      advertisementId,
      agentId,
    );

    if (!advertisement) {
      throw new Error("ADVERTISEMENT_NOT_FOUND");
    }

    const photo = await transactionFindPhotoByIdAndAdvertisementId(
      queryRunner.manager,
      photoId,
      advertisementId,
    );

    if (!photo) {
      throw new Error("PHOTO_NOT_FOUND");
    }

    const oldUrl = photo.url;

    const newUrl = `${baseUrl}/uploads/tmp/photos/${file.filename}`;
    const newFormat = extToFormatNoString(path.extname(file.originalname));

    photo.url = newUrl;
    photo.format = newFormat;

    const updatedPhoto = await savePhoto(queryRunner.manager, photo);

    await queryRunner.commitTransaction();

    try {
      const uploadDir = process.env.UPLOAD_DIR;
      if (!uploadDir) {
        throw new Error("UPLOAD_DIR environment variable is not defined");
      }

      const relativeOldPath = getRelativePathFromUrl(oldUrl, baseUrl);

      if (relativeOldPath.startsWith("/uploads/tmp/photos/")) {
        const fileName = path.basename(relativeOldPath);
        const absoluteOldPath = path.join(uploadDir, "tmp", "photos", fileName);
        await fs.unlink(absoluteOldPath);
      }
    } catch (fileError) {
      console.error("Failed to delete old photo file:", fileError);
    }

    return updatedPhoto;
  } catch (error) {
    await queryRunner.rollbackTransaction();

    try {
      if (file?.filename) {
        const uploadDir = process.env.UPLOAD_DIR;
        if (uploadDir) {
          const newUploadedFilePath = path.join(
            uploadDir,
            "tmp",
            "photos",
            file.filename,
          );
          await fs.unlink(newUploadedFilePath);
        }
      }
    } catch (cleanupError) {
      console.error("Failed to cleanup new uploaded file:", cleanupError);
    }

    throw error;
  } finally {
    await queryRunner.release();
  }
}
