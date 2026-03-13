import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source.js";
import { Photo } from "../entities/photo.js";
export const PhotoRepository = AppDataSource.getRepository(Photo);
/**
 * Find a photo by its ID and the ID of the associated advertisement. This function queries the database for a photo that matches the provided photo ID and is linked to an advertisement with the specified advertisement ID. It returns the photo if found, or null if no matching photo exists.
 * @param manager The EntityManager instance used to perform database operations within a transaction
 * @param photoId The unique identifier of the photo to find
 * @param advertisementId The unique identifier of the associated advertisement
 * @returns A Promise that resolves to the Photo object if found, or null if not found
 */
export async function transactionFindPhotoByIdAndAdvertisementId(
  manager: EntityManager,
  photoId: number,
  advertisementId: number,
) {
  return manager.getRepository(Photo).findOne({
    where: {
      id: photoId,
      advertisement: { id: advertisementId },
    },
    relations: {
      advertisement: true,
    },
  });
}
/**
 * Save a photo to the database. This function takes an EntityManager instance and a Photo object, and saves the photo to the database using the provided EntityManager. It returns a Promise that resolves to the saved Photo object, which may include additional fields such as the generated ID.
 * @param manager The EntityManager instance used to perform database operations within a transaction
 * @param photo The Photo object to save to the database
 * @returns A Promise that resolves to the saved Photo object
 */
export async function savePhoto(manager: EntityManager, photo: Photo) {
  return manager.getRepository(Photo).save(photo);
}
