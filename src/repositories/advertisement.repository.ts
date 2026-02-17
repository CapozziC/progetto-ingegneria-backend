import { AppDataSource } from "../data-source.js";
import { Advertisement } from "../entities/advertisement.js";
import { RealEstate } from "../entities/realEstate.js";
export const AdvertisementRepository =
  AppDataSource.getRepository(Advertisement);

const advertisementRelations = {
  realEstate: true,
  photos: true,
  offers: true,
  appointments: true,
  pois: true,
} as const;

/**
 * Helper function to build the where clause for finding advertisements by agent ID. This function constructs a where clause that filters advertisements based on the associated agent's ID. It is used in the findAdvertisementsByAgentId function to retrieve advertisements created by a specific agent.
 * @param agentId The unique identifier of the agent whose advertisements to filter by
 * @returns An object representing the where clause for filtering advertisements by agent ID
 */
function withAgent(agentId: number) {
  return { agent: { id: agentId } };
}

/**
 * Find all advertisements created by a specific agent, including their related real estate, photos, offers, appointments, and points of interest. The results are ordered by creation date in descending order.
 * @param agentId The unique identifier of the agent whose advertisements to find
 * @returns A Promise that resolves to an array of Advertisement objects with their related entities
 */
export const findAdvertisementsByAgentId = async (agentId: number) => {
  return AdvertisementRepository.find({
    where: withAgent(agentId),
    relations: advertisementRelations,
    order: { createdAt: "DESC" },
  });
};

/**
 * Find the owner (agent) ID of a specific advertisement. This function queries the database for the advertisement with the given ID and retrieves the ID of the agent who created it. If the advertisement is not found or does not have an associated agent, it returns null.
 * @param advertisementId  The unique identifier of the advertisement whose owner ID to find
 * @returns  A Promise that resolves to the ID of the agent who owns the advertisement, or null if the advertisement is not found or does not have an associated agent
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
 * @param advertisementId The unique identifier of the advertisement to delete
 * @returns A Promise that resolves when the deletion is complete
 */
export const deleteAdvertisementById = async (advertisementId: number) => {
  await AppDataSource.transaction(async (manager) => {
    const advertisementRepo = manager.getRepository(Advertisement);
    const realEstateRepo = manager.getRepository(RealEstate);

    const adv = await advertisementRepo.findOne({
      where: { id: advertisementId },
      relations: { realEstate: true },
    });
    if (!adv) return;

    const realEstateId = adv.realEstate?.id;

    await advertisementRepo.delete({ id: advertisementId });

    if (realEstateId) {
      await realEstateRepo.delete({ id: realEstateId });
    }
  });
};


