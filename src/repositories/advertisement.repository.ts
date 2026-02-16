import { AppDataSource } from "../data-source.js";
import { Advertisement } from "../entities/advertisement.js";
import { RealEstate } from "../entities/realEstate.js";
export const AdvertisementRepository =
  AppDataSource.getRepository(Advertisement);

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
