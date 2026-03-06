import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source.js";
import { Advertisement } from "../entities/advertisement.js";
import { RealEstate } from "../entities/realEstate.js";
export const AdvertisementRepository =
  AppDataSource.getRepository(Advertisement);

/**
 * Helper function to build the where clause for finding advertisements by agent ID. This function constructs a where clause that filters advertisements based on the associated agent's ID. It is used in the findAdvertisementsByAgentId function to retrieve advertisements created by a specific agent.
 * @param agentId The unique identifier of the agent whose advertisements to filter by
 * @returns An object representing the where clause for filtering advertisements by agent ID
 */
function withAgent(agentId: number) {
  return { agent: { id: agentId } };
}
/**
 *
 * Find all advertisements created by a specific agent.
 * This function queries the database for advertisements that are associated with the given agent ID.
 * It retrieves the advertisements along with their related real estate, photos, and points of interest (POIs), and orders them by ID in descending order and photos by their position in ascending order.
 * @param agentId
 * @returns
 */
export async function findAdvertisementsByAgentId(agentId: number) {
  return AdvertisementRepository.find({
    where: withAgent(agentId),
    relations: {
      realEstate: true,
      photos: true,
      pois: true,
    },
    order: {
      id: "DESC",
      photos: { position: "ASC" },
    },
  });
}
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
 * Find an advertisement by its ID, along with its related real estate, photos, and points of interest (POIs).
 * @param advertisementId The unique identifier of the advertisement to find
 * @returns A Promise that resolves to the advertisement object or null if not found
 */
export async function findAdvertisementById(advertisementId: number) {
  const qb = AppDataSource.getRepository(Advertisement)
    .createQueryBuilder("adv")
    .leftJoinAndSelect("adv.realEstate", "re")
    .leftJoinAndSelect("adv.photos", "photos")
    .leftJoinAndSelect("adv.pois", "pois")
    .leftJoin("adv.agent", "agent")
    .addSelect([
      "agent.id",
      "agent.firstName",
      "agent.lastName",
      "agent.phoneNumber",
    ])
    .where("adv.id = :id", { id: advertisementId });

  return qb.getOne();
}

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

//Query for transaction to advertisement
export function advRepo(manager?: EntityManager) {
  return manager
    ? manager.getRepository(Advertisement)
    : AdvertisementRepository;
}

export async function findAdvertisementStatusById(
  advertisementId: number,
  manager: EntityManager,
): Promise<string | null> {
  const advertisement = await manager.findOne(Advertisement, {
    where: { id: advertisementId },
    select: {
      id: true,
      status: true,
    },
  });

  return advertisement?.status ?? null;
}
type FindAdvertisementsParams = {
  take: number;
  skip: number;
  status?: string;
  type?: string;
  lat?: number;
  lon?: number;
  radiusMeters: number;
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  maxSize?: number;
  rooms?: number;
  floor?: number;
  elevator?: boolean;
  airConditioning?: boolean;
  heating?: boolean;
  concierge?: boolean;
  parking?: boolean;
  garage?: boolean;
  furnished?: boolean;
  solarPanels?: boolean;
  balcony?: boolean;
  terrace?: boolean;
  housingType?: string;
  garden?: boolean;
};

export async function findAdvertisements({
  take,
  skip,
  status,
  type,
  lat,
  lon,
  radiusMeters,
  minPrice,
  maxPrice,
  minSize,
  maxSize,
  rooms,
  floor,
  elevator,
  airConditioning,
  heating,
  concierge,
  parking,
  garage,
  furnished,
  solarPanels,
  balcony,
  terrace,
  garden,
  housingType,
}: FindAdvertisementsParams) {
  const qb = AppDataSource.getRepository(Advertisement)
    .createQueryBuilder("adv")
    .leftJoinAndSelect("adv.realEstate", "re")
    .leftJoinAndSelect("adv.photos", "photos")
    .leftJoinAndSelect("adv.agent", "agent")
    .leftJoinAndSelect("adv.pois", "pois");

  if (status) {
    qb.andWhere("adv.status = :status", { status });
  }

  if (type) {
    qb.andWhere("adv.type = :type", { type });
  }

  if (minPrice !== undefined) {
    qb.andWhere("adv.price >= :minPrice", { minPrice });
  }

  if (maxPrice !== undefined) {
    qb.andWhere("adv.price <= :maxPrice", { maxPrice });
  }

  if (minSize !== undefined) {
    qb.andWhere("re.size >= :minSize", { minSize });
  }

  if (maxSize !== undefined) {
    qb.andWhere("re.size <= :maxSize", { maxSize });
  }

  if (rooms !== undefined) {
    qb.andWhere("re.rooms = :rooms", { rooms });
  }
  if (housingType) {
    qb.andWhere("re.housingType = :housingType", { housingType });
  }
  if (floor !== undefined) {
    qb.andWhere("re.floor = :floor", { floor });
  }

  const booleanFilters = {
    elevator,
    airConditioning,
    heating,
    concierge,
    parking,
    garage,
    furnished,
    solarPanels,
    balcony,
    terrace,
    garden,
  };

  for (const [field, value] of Object.entries(booleanFilters)) {
    if (value !== undefined) {
      qb.andWhere(`re.${field} = :${field}`, { [field]: value });
    }
  }

  if (
    lat !== undefined &&
    lon !== undefined &&
    Number.isFinite(lat) &&
    Number.isFinite(lon)
  ) {
    qb.andWhere(
      `
      ST_DWithin(
        re.location::geography,
        ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
        :radiusMeters
      )
      `,
      { lat, lon, radiusMeters },
    );

    qb.addSelect(
      `
      ST_Distance(
        re.location::geography,
        ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
      )
      `,
      "distance",
    );

    qb.orderBy("distance", "ASC");
  } else {
    qb.orderBy("adv.id", "DESC");
  }

  qb.take(take).skip(skip);

  const [items, total] = await qb.getManyAndCount();

  return {
    total,
    take,
    skip,
    items,
  };
}
