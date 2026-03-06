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

type FindAccountNegotiationsParams = {
  accountId: number;
  take: number;
  skip: number;
};

type FindAccountNegotiationDetailParams = {
  accountId: number;
  advertisementId: number;
  agentId: number;
};

export async function findAccountNegotiations({
  accountId,
  take,
  skip,
}: FindAccountNegotiationsParams) {
  const offers = await AppDataSource.getRepository(Offer)
    .createQueryBuilder("offer")
    .leftJoinAndSelect("offer.advertisement", "adv")
    .leftJoinAndSelect("adv.realEstate", "re")
    .leftJoinAndSelect("adv.photos", "photos")
    .leftJoin("adv.agent", "agent")
    .addSelect(["agent.name", "agent.phoneNumber", "agent.email"])
    .where("offer.accountId = :accountId", { accountId })
    .orderBy("offer.createdAt", "DESC")
    .addOrderBy("offer.id", "DESC")
    .getMany();

  const grouped = new Map<
    string,
    {
      advertisementId: number;
      accountId: number;
      agentId: number;
      offersCount: number;
      lastOffer: {
        id: number;
        price: number;
        status: string;
        madeBy: string;
        createdAt: string;
      };
      advertisement: {
        id: number;
        price: number;
        type: string;
        status: string;
        previewPhoto: string | null;
        realEstate: {
          size: number;
          rooms: number;
          floor: number;
          housingType: string;
        } | null;
      };
      agent: {
        firstName: string | null;
        lastName: string | null;
        phoneNumber: string | null;
        username: string | null;
      } | null;
      updatedAt: string;
    }
  >();

  for (const offer of offers) {
    const key = `${offer.advertisementId}-${offer.agentId}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        advertisementId: offer.advertisementId,
        accountId: offer.accountId,
        agentId: offer.agentId,
        offersCount: 1,
        lastOffer: {
          id: offer.id,
          price: offer.price,
          status: offer.status,
          madeBy: offer.madeBy,
          createdAt: offer.createdAt.toISOString(),
        },
        advertisement: {
          id: offer.advertisement.id,
          price: offer.advertisement.price,
          type: offer.advertisement.type,
          status: offer.advertisement.status,
          previewPhoto: offer.advertisement.photos?.[0]?.url ?? null,
          realEstate: offer.advertisement.realEstate
            ? {
                size: offer.advertisement.realEstate.size,
                rooms: offer.advertisement.realEstate.rooms,
                floor: offer.advertisement.realEstate.floor,
                housingType: offer.advertisement.realEstate.housingType,
              }
            : null,
        },
        agent: offer.advertisement.agent
          ? {
              firstName: offer.advertisement.agent.firstName ?? null,
              lastName: offer.advertisement.agent.lastName ?? null,
              phoneNumber: offer.advertisement.agent.phoneNumber ?? null,
              username: offer.advertisement.agent.username ?? null,
            }
          : null,
        updatedAt: offer.createdAt.toISOString(),
      });
    } else {
      const current = grouped.get(key)!;
      current.offersCount += 1;
    }
  }

  const items = Array.from(grouped.values())
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(skip, skip + take);

  return {
    total: grouped.size,
    take,
    skip,
    items,
  };
}

export async function findAccountNegotiationDetail({
  accountId,
  advertisementId,
  agentId,
}: FindAccountNegotiationDetailParams) {
  const offers = await AppDataSource.getRepository(Offer)
    .createQueryBuilder("offer")
    .leftJoinAndSelect("offer.advertisement", "adv")
    .leftJoinAndSelect("adv.realEstate", "re")
    .leftJoinAndSelect("adv.photos", "photos")
    .leftJoin("adv.agent", "agent")
    .addSelect(["agent.name", "agent.phoneNumber", "agent.email"])
    .where("offer.accountId = :accountId", { accountId })
    .andWhere("offer.advertisementId = :advertisementId", { advertisementId })
    .andWhere("offer.agentId = :agentId", { agentId })
    .orderBy("offer.createdAt", "ASC")
    .addOrderBy("offer.id", "ASC")
    .getMany();

  if (!offers.length) return null;

  const first = offers[0]!;
  const advertisement = first.advertisement;

  return {
    advertisementId,
    accountId,
    agentId,
    advertisement: {
      id: advertisement.id,
      price: advertisement.price,
      type: advertisement.type,
      status: advertisement.status,
      previewPhoto: advertisement.photos?.[0]?.url ?? null,
      realEstate: advertisement.realEstate
        ? {
            size: advertisement.realEstate.size,
            rooms: advertisement.realEstate.rooms,
            floor: advertisement.realEstate.floor,
            elevator: advertisement.realEstate.elevator,
            airConditioning: advertisement.realEstate.airConditioning,
            heating: advertisement.realEstate.heating,
            concierge: advertisement.realEstate.concierge,
            parking: advertisement.realEstate.parking,
            garage: advertisement.realEstate.garage,
            furnished: advertisement.realEstate.furnished,
            solarPanels: advertisement.realEstate.solarPanels,
            balcony: advertisement.realEstate.balcony,
            terrace: advertisement.realEstate.terrace,
            garden: advertisement.realEstate.garden,
            housingType: advertisement.realEstate.housingType,
            energyClass: advertisement.realEstate.energyClass,
            sizeLabel: `${advertisement.realEstate.size} m²`,
          }
        : null,
    },
    agent: advertisement.agent
      ? {
          firstName: advertisement.agent.firstName ?? null,
          lastName: advertisement.agent.lastName ?? null,
          phoneNumber: advertisement.agent.phoneNumber ?? null,
          username: advertisement.agent.username ?? null,
        }
      : null,
    offers: offers.map((offer) => ({
      id: offer.id,
      price: offer.price,
      status: offer.status,
      madeBy: offer.madeBy,
      createdAt: offer.createdAt.toISOString(),
    })),
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

type FindAgentNegotiationsParams = {
  agentId: number;
  take: number;
  skip: number;
};

type FindAgentNegotiationDetailParams = {
  agentId: number;
  advertisementId: number;
  accountId: number;
};

export async function findAgentNegotiations({
  agentId,
  take,
  skip,
}: FindAgentNegotiationsParams) {
  const offers = await AppDataSource.getRepository(Offer)
    .createQueryBuilder("offer")
    .leftJoinAndSelect("offer.advertisement", "adv")
    .leftJoinAndSelect("adv.realEstate", "re")
    .leftJoinAndSelect("adv.photos", "photos")
    .leftJoin("offer.account", "account")
    .addSelect(["account.firstName", "account.lastName", "account.email"])
    .where("offer.agentId = :agentId", { agentId })
    .orderBy("offer.createdAt", "DESC")
    .addOrderBy("offer.id", "DESC")
    .getMany();

  const grouped = new Map<
    string,
    {
      advertisementId: number;
      accountId: number;
      agentId: number;
      offersCount: number;
      lastOffer: {
        id: number;
        price: number;
        status: string;
        madeBy: string;
        createdAt: string;
      };
      advertisement: {
        id: number;
        price: number;
        type: string;
        status: string;
        previewPhoto: string | null;
        realEstate: {
          size: number;
          rooms: number;
          floor: number;
          housingType: string;
        } | null;
      };
      account: {
        firstName: string | null;
        lastName: string | null;
        email: string | null;
      } | null;
      updatedAt: string;
    }
  >();

  for (const offer of offers) {
    const key = `${offer.advertisementId}-${offer.accountId}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        advertisementId: offer.advertisementId,
        accountId: offer.accountId,
        agentId: offer.agentId,
        offersCount: 1,
        lastOffer: {
          id: offer.id,
          price: offer.price,
          status: offer.status,
          madeBy: offer.madeBy,
          createdAt: offer.createdAt.toISOString(),
        },
        advertisement: {
          id: offer.advertisement.id,
          price: offer.advertisement.price,
          type: offer.advertisement.type,
          status: offer.advertisement.status,
          previewPhoto: offer.advertisement.photos?.[0]?.url ?? null,
          realEstate: offer.advertisement.realEstate
            ? {
                size: offer.advertisement.realEstate.size,
                rooms: offer.advertisement.realEstate.rooms,
                floor: offer.advertisement.realEstate.floor,
                housingType: offer.advertisement.realEstate.housingType,
              }
            : null,
        },
        account: offer.account
          ? {
              firstName: offer.account.firstName ?? null,
              lastName: offer.account.lastName ?? null,
              email: offer.account.email ?? null,
            }
          : null,
        updatedAt: offer.createdAt.toISOString(),
      });
    } else {
      const current = grouped.get(key)!;
      current.offersCount += 1;
    }
  }

  const items = Array.from(grouped.values())
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(skip, skip + take);

  return {
    total: grouped.size,
    take,
    skip,
    items,
  };
}

export async function findAgentNegotiationDetail({
  agentId,
  advertisementId,
  accountId,
}: FindAgentNegotiationDetailParams) {
  const offers = await AppDataSource.getRepository(Offer)
    .createQueryBuilder("offer")
    .leftJoinAndSelect("offer.advertisement", "adv")
    .leftJoinAndSelect("adv.realEstate", "re")
    .leftJoinAndSelect("adv.photos", "photos")
    .leftJoin("offer.account", "account")
    .addSelect(["account.firstName", "account.lastName", "account.email"])
    .where("offer.agentId = :agentId", { agentId })
    .andWhere("offer.advertisementId = :advertisementId", { advertisementId })
    .andWhere("offer.accountId = :accountId", { accountId })
    .orderBy("offer.createdAt", "ASC")
    .addOrderBy("offer.id", "ASC")
    .getMany();

  if (!offers.length) return null;

  const first = offers[0]!;
  const advertisement = first.advertisement;

  return {
    advertisementId,
    accountId,
    agentId,
    advertisement: {
      id: advertisement.id,
      price: advertisement.price,
      type: advertisement.type,
      status: advertisement.status,
      previewPhoto: advertisement.photos?.[0]?.url ?? null,
      realEstate: advertisement.realEstate
        ? {
            size: advertisement.realEstate.size,
            rooms: advertisement.realEstate.rooms,
            floor: advertisement.realEstate.floor,
            elevator: advertisement.realEstate.elevator,
            airConditioning: advertisement.realEstate.airConditioning,
            heating: advertisement.realEstate.heating,
            concierge: advertisement.realEstate.concierge,
            parking: advertisement.realEstate.parking,
            garage: advertisement.realEstate.garage,
            furnished: advertisement.realEstate.furnished,
            solarPanels: advertisement.realEstate.solarPanels,
            balcony: advertisement.realEstate.balcony,
            terrace: advertisement.realEstate.terrace,
            garden: advertisement.realEstate.garden,
            housingType: advertisement.realEstate.housingType,
            energyClass: advertisement.realEstate.energyClass,
          }
        : null,
    },
    account: first.account
      ? {
          firstName: first.account.firstName ?? null,
          lastName: first.account.lastName ?? null,
          email: first.account.email ?? null,
        }
      : null,
    offers: offers.map((offer) => ({
      id: offer.id,
      price: offer.price,
      status: offer.status,
      madeBy: offer.madeBy,
      createdAt: offer.createdAt.toISOString(),
    })),
  };
}
