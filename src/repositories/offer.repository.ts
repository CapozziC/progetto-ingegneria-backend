import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source.js";
import { Offer } from "../entities/offer.js";
import { Status, OfferMadeBy } from "../entities/offer.js";

export const OfferRepository = AppDataSource.getRepository(Offer);

export const createOffer = (offerData: Partial<Offer>): Offer => {
  return OfferRepository.create(offerData);
};

export const saveOffer = async (offer: Offer): Promise<Offer> => {
  return await OfferRepository.save(offer);
};

export const existPendingOfferByAdvertisementIdAndAccountId = async (
  advertisementId: number,
  accountId: number,
): Promise<Offer | null> => {
  return OfferRepository.findOne({
    where: {
      advertisementId,
      accountId,
      status: Status.PENDING,
    },
  });
};

type FindOffersByAccountIdParams = {
  accountId: number;
  take: number;
  skip: number;
  status?: string;
};

export async function findOffersByAccountId({
  accountId,
  take,
  skip,
  status,
}: FindOffersByAccountIdParams) {
  const qb = AppDataSource.getRepository(Offer)
    .createQueryBuilder("offer")
    .leftJoinAndSelect("offer.advertisement", "adv")
    .leftJoinAndSelect("adv.realEstate", "re")
    .leftJoinAndSelect("adv.photos", "photos")
    .leftJoin("adv.agent", "agent")
    .addSelect(["agent.id", "agent.name", "agent.phoneNumber", "agent.email"])
    .where("offer.accountId = :accountId", { accountId });

  if (status) {
    qb.andWhere("offer.status = :status", { status });
  }

  qb.orderBy("offer.createdAt", "DESC").take(take).skip(skip);

  const [items, total] = await qb.getManyAndCount();

  return {
    total,
    take,
    skip,
    items,
  };
}

export const findOfferByIdForAgent = async (
  offerId: number,
  agentId: number,
): Promise<Offer | null> => {
  return OfferRepository.findOne({
    where: { id: offerId, agentId },
  });
};

// Query for transaction to offer
function offerRepo(manager?: EntityManager) {
  return manager ? manager.getRepository(Offer) : OfferRepository;
}

export const rejectOfferById = async (
  offerId: number,
  manager?: EntityManager,
): Promise<void> => {
  await offerRepo(manager).update({ id: offerId }, { status: Status.REJECTED });
};

export const createCounterOffer = async (
  input: {
    price: number;
    advertisementId: number;
    accountId: number;
    agentId: number;
  },
  manager?: EntityManager,
): Promise<Offer> => {
  const repo = offerRepo(manager);

  const counterOffer = repo.create({
    price: input.price,
    advertisementId: input.advertisementId,
    accountId: input.accountId,
    agentId: input.agentId,
    madeBy: OfferMadeBy.AGENT,
    status: Status.PENDING,
  });

  return repo.save(counterOffer);
};

export async function findLatestPendingAccountOfferForAdvertisementAndAccount(
  params: { advertisementId: number; agentId: number; accountId: number },
  manager: EntityManager,
): Promise<Offer | null> {
  const { advertisementId, agentId, accountId } = params;

  return manager.getRepository(Offer).findOne({
    where: {
      advertisementId,
      agentId,
      accountId,
      status: Status.PENDING,
      madeBy: OfferMadeBy.ACCOUNT,
    },
    order: { createdAt: "DESC" },
  });
}

export async function findLatestPendingAgentOfferForNegotiation(
  params: { advertisementId: number; agentId: number; accountId: number },
  manager: EntityManager,
): Promise<Offer | null> {
  const { advertisementId, agentId, accountId } = params;

  return manager.getRepository(Offer).findOne({
    where: {
      advertisementId,
      agentId,
      accountId,
      status: Status.PENDING,
      madeBy: OfferMadeBy.AGENT,
    },
    order: { createdAt: "DESC" },
  });
}
