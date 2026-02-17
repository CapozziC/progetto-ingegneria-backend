import { AppDataSource } from "../data-source.js";
import { Advertisement } from "../entities/advertisement.js";
import { RealEstate } from "../entities/realEstate.js";
export const AdvertisementRepository =
  AppDataSource.getRepository(Advertisement);

/**
 * Find all advertisements created by a specific agent, including their related real estate, photos, offers, appointments, and points of interest. The results are ordered by creation date in descending order.
 * @param agentId The unique identifier of the agent whose advertisements to find
 * @returns A Promise that resolves to an array of Advertisement objects with their related entities
 */
export const findAdvertisementsByAgentId = async (agentId: number) => {
  return AdvertisementRepository.find({
    where: { agent: { id: agentId } },
    relations: {
      realEstate: true,
      photos: true,
      offers: true,
      appointments: true,
      pois: true,
    },
    order: { createdAt: "DESC" },
  });
};

/**
 * Find the owner (agent) ID of a specific advertisement. This function queries the database for the advertisement with the given ID and retrieves the ID of the agent who created it. If the advertisement is not found or does not have an associated agent, it returns null.
 * @param advertisementId 
 * @returns 
 */
export const findAdvertisementOwnerId = async (
  advertisementId: number,
): Promise<number | null> => {
  const adv = await AdvertisementRepository.findOne({
    where: { id: advertisementId },
    select: {
      id: true,
      agent: { id: true },
    },
    relations: {
      agent: true,
    },
  });

  return adv?.agent?.id ?? null;
};

/**              
 * Delete an advertisement by its ID, along with its related real estate. This function performs a database transaction to ensure that both the advertisement and its associated real estate are deleted atomically. If the advertisement is not found, the function simply returns without performing any deletion.   
 * @param advertisementId 
 */
export const deleteAdvertisementById = async (advertisementId: number) => {
  await AppDataSource.transaction(async (manager) => {
    const adv = await manager.getRepository(Advertisement).findOne({
      where: { id: advertisementId },
      relations: { realEstate: true },
    });
    if (!adv) return;

    const realEstateId = adv.realEstate?.id;

    await manager.getRepository(Advertisement).delete({ id: advertisementId });

    if (realEstateId) {
      await manager.getRepository(RealEstate).delete({ id: realEstateId });
    }
  });
};


