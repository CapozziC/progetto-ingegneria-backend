import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source.js";
import { Offer } from "../entities/offer.js";
import { Status, OfferMadeBy } from "../entities/offer.js";
import {
  FindAccountNegotiationsParams,
  FindAccountNegotiationDetailParams,
  FindAgentNegotiationsParams,
  FindAgentNegotiationDetailParams,
} from "../types/offer.type.js";

export const OfferRepository = AppDataSource.getRepository(Offer);

/**
 * Find an offer by its ID and the associated agent ID. This function queries the database for an offer with the specified offer ID and agent ID, allowing agents to retrieve details of offers they have made or received. If such an offer exists, it returns the Offer object; otherwise, it returns null.
 * @param offerId The unique identifier of the offer to find
 * @param agentId The unique identifier of the agent associated with the offer
 * @returns A Promise that resolves to the Offer object if found, or null if no such offer exists
 */
export const createOffer = (offerData: Partial<Offer>): Offer => {
  return OfferRepository.create(offerData);
};

/** Save an offer to the database. This function takes an Offer object as input and persists it to the database using the OfferRepository. It returns a Promise that resolves to the saved Offer object, which may include additional properties such as the generated ID and timestamps after being saved.
 * @param offer The Offer object to save to the database
 * @returns A Promise that resolves to the saved Offer object with any additional properties set by the database
 */
export const saveOffer = async (offer: Offer): Promise<Offer> => {
  return await OfferRepository.save(offer);
};

/** Find an offer by its unique identifier (ID). This function queries the database for an offer with the specified ID and returns it if found. If no offer is found with the given ID, it returns null.
 * @param offerId The unique identifier of the offer to find
 * @returns A Promise that resolves to the Offer object if found, or null if no such offer exists
 */

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

/**
 * Find an offer by its unique identifier (ID). This function queries the database for an offer with the specified ID and returns it if found. If no offer is found with the given ID, it returns null.
 * @param offerId The unique identifier of the offer to find
 * @returns A Promise that resolves to the Offer object if found, or null if no such offer exists
 */
export async function findAccountNegotiations({
  accountId,
}: FindAccountNegotiationsParams) {
  const offers = await AppDataSource.getRepository(Offer)
    .createQueryBuilder("offer")
    .leftJoinAndSelect("offer.advertisement", "adv")
    .leftJoin("adv.realEstate", "re")
    .addSelect(["re.addressFormatted"])
    .leftJoin("adv.agent", "agent")
    .addSelect([
      "agent.id",
      "agent.firstName",
      "agent.lastName",
      "agent.phoneNumber",
    ])
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
        realEstate: {
          addressFormatted: string | null;
        };
      };
      agent: {
        id: number;
        firstName: string | null;
        lastName: string | null;
        phoneNumber: string | null;
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
          realEstate: {
            addressFormatted:
              offer.advertisement.realEstate.addressFormatted || null,
          },
        },
        agent: offer.advertisement.agent
          ? {
              id: offer.advertisement.agent.id,
              firstName: offer.advertisement.agent.firstName ?? null,
              lastName: offer.advertisement.agent.lastName ?? null,
              phoneNumber: offer.advertisement.agent.phoneNumber ?? null,
            }
          : null,
        updatedAt: offer.createdAt.toISOString(),
      });
    } else {
      const current = grouped.get(key)!;
      current.offersCount += 1;
    }
  }

  const items = Array.from(grouped.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return {
    total: grouped.size,
    items,
  };
}

/**
 * Find detailed information about negotiations associated with a specific account, advertisement, and agent. This function retrieves all offers related to the specified account ID, advertisement ID, and agent ID, along with details of the associated advertisement and agent. It returns an object containing the advertisement details, agent details, and a list of offers in the negotiation, or null if no offers are found for the given parameters.
 * @param accountId The unique identifier of the account involved in the negotiation
 * @param advertisementId The unique identifier of the advertisement involved in the negotiation
 * @param agentId The unique identifier of the agent involved in the negotiation
 * @returns A Promise that resolves to an object containing detailed information about the negotiation, or null if no such negotiation exists
 */
export async function findAccountNegotiationDetail({
  accountId,
  advertisementId,
  agentId,
}: FindAccountNegotiationDetailParams) {
  const offers = await AppDataSource.getRepository(Offer)
    .createQueryBuilder("offer")
    .leftJoinAndSelect("offer.advertisement", "adv")
    .leftJoin("adv.realEstate", "re")
    .addSelect(["re.addressFormatted"])
    .leftJoin("adv.agent", "agent")
    .addSelect(["agent.firstName", "agent.lastName", "agent.phoneNumber"])
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
      realEstate: {
        addressFormatted: advertisement.realEstate.addressFormatted || null,
      },
    },
    agent: advertisement.agent
      ? {
          id: advertisement.agent.id,
          firstName: advertisement.agent.firstName ?? null,
          lastName: advertisement.agent.lastName ?? null,
          phoneNumber: advertisement.agent.phoneNumber ?? null,
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
/**
 * Find an offer by its unique identifier (ID) for a specific agent. This function queries the database for an offer with the specified ID and agent ID and returns it if found. If no offer is found with the given ID and agent ID, it returns null.
 * @param offerId The unique identifier of the offer to find
 * @param agentId The unique identifier of the agent associated with the offer
 * @returns A Promise that resolves to the Offer object if found, or null if no such offer exists
 */
export const findOfferByIdForAgent = async (
  offerId: number,
  agentId: number,
): Promise<Offer | null> => {
  return OfferRepository.findOne({
    where: { id: offerId, agentId },
  });
};

// QUERY TRANSACTIONAL REPOSITORY FUNCTIONS

/**
 * Helper function to get the Offer repository, optionally using a provided EntityManager for transactional operations. If an EntityManager is provided, it returns the repository from that manager; otherwise, it returns the default OfferRepository. This allows for flexibility in performing database operations within transactions when needed.
 * @param manager An optional EntityManager to use for transactional operations. If not provided, the default OfferRepository will be used.
 * @return The Offer repository, either from the provided EntityManager or the default OfferRepository
 */
function offerRepo(manager?: EntityManager) {
  return manager ? manager.getRepository(Offer) : OfferRepository;
}

/**
 * Reject an offer by its unique identifier (ID). This function updates the status of the offer with the specified ID to "REJECTED" in the database. It can be used to reject offers that are no longer valid or acceptable. If an EntityManager is provided, it will use that manager to perform the update within a transaction; otherwise, it will use the default OfferRepository.
 * @param offerId The unique identifier of the offer to reject
 * @param manager An optional EntityManager to use for transactional operations. If not provided, the default OfferRepository will be used.
 * @return A Promise that resolves when the offer has been successfully rejected. If the offer with the specified ID does not exist, it will still resolve without throwing an error, as the update operation will simply have no effect.
 */
export const rejectOfferById = async (
  offerId: number,
  manager?: EntityManager,
): Promise<void> => {
  await offerRepo(manager).update({ id: offerId }, { status: Status.REJECTED });
};

/**
 * Create a counter offer by an agent for a specific advertisement and account. This function takes the necessary details to create a new offer, including the price, advertisement ID, account ID, and agent ID. It creates a new Offer object with the provided data, sets the "madeBy" field to indicate that the offer is made by an agent, and saves it to the database. The function returns the saved Offer object, which includes any additional properties set by the database, such as the generated ID and timestamps.
 * @param input An object containing the price, advertisement ID, account ID, and agent ID required to create a counter offer. The price is the value of the counter offer, the advertisement ID identifies the specific advertisement for which the counter offer is being made, the account ID identifies the account making the original offer that is being countered, and the agent ID ensures that the counter offer is associated with the correct agent.
 * @param manager An optional EntityManager to use for transactional operations. If not provided, the default OfferRepository will be used.
 * @returns A Promise that resolves to the created Offer object representing the counter offer, including any additional properties set by the database after saving.
 */
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

/**
 * Find the latest pending offer made by an account for a specific advertisement and agent. This function queries the database for offers that match the given advertisement ID, agent ID, account ID, and have a status of "PENDING" and were made by an account. It orders the results by creation date in descending order to ensure that the most recent offer is returned. If such an offer exists, it returns the Offer object; otherwise, it returns null.
 * @param params An object containing the advertisement ID, agent ID, and account ID to filter the offers. The advertisement ID identifies the specific advertisement for which to find the offer, the agent ID ensures that the offer is associated with the correct agent, and the account ID identifies the account that made the offer.
 * @param manager An optional EntityManager to use for transactional operations. If not provided, the default OfferRepository will be used.
 * @returns A Promise that resolves to the latest pending Offer object made by an account for the specified advertisement and agent, or null if no such offer exists.
 */
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
/**
 * Find the latest pending offer made by an agent for a specific advertisement and account. This function queries the database for offers that match the given advertisement ID, agent ID, account ID, and have a status of "PENDING" and were made by an agent. It orders the results by creation date in descending order to ensure that the most recent offer is returned. If such an offer exists, it returns the Offer object; otherwise, it returns null.
 * @param params An object containing the advertisement ID, agent ID, and account ID to filter the offers. The advertisement ID identifies the specific advertisement for which to find the offer, the agent ID ensures that the offer is associated with the correct agent, and the account ID identifies the account that made the offer.
 * @param manager An optional EntityManager to use for transactional operations. If not provided, the default OfferRepository will be used.
 * @returns A Promise that resolves to the latest pending Offer object made by an agent for the specified advertisement and account, or null if no such offer exists.
 */
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
/**
 * Reject an offer made by an agent by its unique identifier (ID). This function updates the status of the offer with the specified ID to "REJECTED" in the database. It can be used to reject offers that are no longer valid or acceptable. If an EntityManager is provided, it will use that manager to perform the update within a transaction; otherwise, it will use the default OfferRepository.
 * @param offerId The unique identifier of the offer to reject
 * @param manager An optional EntityManager to use for transactional operations. If not provided, the default OfferRepository will be used.
 * @return A Promise that resolves when the offer has been successfully rejected. If the offer with the specified ID does not exist, it will still resolve without throwing an error, as the update operation will simply have no effect.
 */
export async function findAgentNegotiations({
  agentId,
}: FindAgentNegotiationsParams) {
  const offers = await AppDataSource.getRepository(Offer)
    .createQueryBuilder("offer")
    .leftJoin("offer.advertisement", "adv")
    .addSelect(["adv.id", "adv.price", "adv.status"])
    .leftJoin("adv.realEstate", "re")
    .addSelect(["re.addressFormatted"])
    .leftJoin("offer.account", "account")
    .addSelect([
      "account.id",
      "account.firstName",
      "account.lastName",
      "account.email",
    ])
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
        realEstate: {
          addressFormatted: string | null;
        };
      };
      account: {
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        id: number;
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
          realEstate: {
            addressFormatted:
              offer.advertisement.realEstate.addressFormatted || null,
          },
        },
        account: offer.account
          ? {
              id: offer.account.id,
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

  const items = Array.from(grouped.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return {
    total: grouped.size,
    items,
  };
}

/**
 * Find detailed information about negotiations associated with a specific agent, advertisement, and account. This function retrieves all offers related to the specified agent ID, advertisement ID, and account ID, along with details of the associated advertisement and account. It returns an object containing the advertisement details, account details, and a list of offers in the negotiation, or null if no offers are found for the given parameters.
 * @param agentId The unique identifier of the agent involved in the negotiation
 * @param advertisementId The unique identifier of the advertisement involved in the negotiation
 * @param accountId The unique identifier of the account involved in the negotiation
 * @returns A Promise that resolves to an object containing detailed information about the negotiation, or null if no such negotiation exists
 */
export async function findAgentNegotiationDetail({
  agentId,
  advertisementId,
  accountId,
}: FindAgentNegotiationDetailParams) {
  const offers = await AppDataSource.getRepository(Offer)
    .createQueryBuilder("offer")
    .leftJoinAndSelect("offer.advertisement", "adv")
    .leftJoin("adv.realEstate", "re")
    .addSelect(["re.addressFormatted"])
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
      realEstate: {
        addressFormatted: advertisement.realEstate.addressFormatted || null,
      },
    },
    account: first.account
      ? {
          id: first.account.id,
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

export const findAdvertisementWithOfferId = async (
  offerId: number,
): Promise<number | null> => {
  const offer = await AppDataSource.getRepository(Offer)
    .createQueryBuilder("offer")
    .leftJoinAndSelect("offer.advertisement", "adv")
    .where("offer.id = :offerId", { offerId })
    .getOne();
  return offer ? offer.advertisementId : null;
};
