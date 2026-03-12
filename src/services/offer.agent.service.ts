import { AppDataSource } from "../data-source.js";
import { Offer } from "../entities/offer.js";
import { Advertisement } from "../entities/advertisement.js";
import { Appointment } from "../entities/appointment.js";
import { Type, Status as AdvStatus } from "../entities/advertisement.js";
import { Status } from "../entities/offer.js";
import { Status as AppStatus } from "../entities/appointment.js";
import { Not, In } from "typeorm";
import {
  AcceptOfferByAgentParams,
  AcceptOfferByAgentResult,
  CreateAgentCounterOfferParams,
  CreateAgentCounterOfferResult,
} from "../types/offer.type.js";
import { findAdvertisementStatusById } from "../repositories/advertisement.repository.js";
import { createCounterOffer, findLatestPendingAccountOfferForAdvertisementAndAccount, rejectOfferById } from "../repositories/offer.repository.js";

/**
 * Accepts an offer by an agent, updates the advertisement status to SOLD, sets the sold price and date, rejects all other pending offers for the same advertisement, and cancels all related appointments. This function performs all operations within a single transaction to ensure data consistency. It takes the offer ID and agent ID as parameters, validates the offer and advertisement conditions, and returns the result of the accepted offer including the offer ID, advertisement ID, new advertisement status, sold price, and sold date.
 * @param param0   - An object containing the offer ID and agent ID required to accept the offer. The offer ID is used to identify the specific offer being accepted, while the agent ID is used to ensure that the offer belongs to the correct agent and to enforce authorization checks.
 * @return - A Promise that resolves to an object containing the details of the accepted offer, including the offer ID, advertisement ID, new advertisement status (SOLD), sold price, and sold date. If any validation fails or if there are issues during the transaction, an error is thrown with an appropriate message indicating the reason for the failure.
 */
export async function acceptOfferByAgent({
  offerId,
  agentId,
}: AcceptOfferByAgentParams): Promise<AcceptOfferByAgentResult> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();

    const offerRepo = queryRunner.manager.getRepository(Offer);
    const advRepo = queryRunner.manager.getRepository(Advertisement);
    const appointmentRepo = queryRunner.manager.getRepository(Appointment);

    const offer = await offerRepo.findOne({
      where: { id: offerId, agentId },
      lock: { mode: "pessimistic_write" },
    });

    if (!offer) {
      throw new Error("OFFER_NOT_FOUND");
    }

    if (offer.agentId !== agentId) {
      throw new Error("FORBIDDEN_OFFER");
    }

    if (offer.status !== Status.PENDING) {
      throw new Error("OFFER_NOT_PENDING");
    }

    const soldPrice = Number(offer.price);
    if (!Number.isFinite(soldPrice) || soldPrice <= 0) {
      throw new Error("INVALID_OFFER_PRICE");
    }

    const advertisement = await advRepo.findOne({
      where: { id: offer.advertisementId },
      lock: { mode: "pessimistic_write" },
    });

    if (!advertisement) {
      throw new Error("ADVERTISEMENT_NOT_FOUND");
    }

    if (advertisement.type !== Type.SALE) {
      throw new Error("ADVERTISEMENT_NOT_SALE");
    }

    if (advertisement.status !== AdvStatus.ACTIVE) {
      throw new Error("ADVERTISEMENT_NOT_ACTIVE");
    }

    advertisement.status = AdvStatus.SOLD;
    advertisement.soldPrice = soldPrice;
    advertisement.soldAt = new Date();
    await advRepo.save(advertisement);

    offer.status = Status.ACCEPTED;
    await offerRepo.save(offer);

    await offerRepo.update(
      {
        advertisementId: offer.advertisementId,
        id: Not(offer.id),
        status: Status.PENDING,
      },
      { status: Status.REJECTED },
    );

    await appointmentRepo.update(
      {
        advertisementId: offer.advertisementId,
        status: In([AppStatus.REQUESTED, AppStatus.CONFIRMED]),
      },
      { status: AppStatus.CANCELLED },
    );

    await queryRunner.commitTransaction();

    return {
      offerId: offer.id,
      advertisementId: offer.advertisementId,
      advertisementStatus: AdvStatus.SOLD,
      soldPrice,
      soldAt: advertisement.soldAt,
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
 
/**
 * Creates a counteroffer by an agent for a specific advertisement, rejects the latest pending offer from the same account for that advertisement, and returns the details of the created counteroffer along with the rejected offer ID. This function performs all operations within a single transaction to ensure data consistency. It takes the advertisement ID, account ID, agent ID, and counteroffer price as parameters, validates the advertisement status and existing offers, and returns the result of the created counteroffer including its ID, price, status, maker, and creation date.
 * @param param0 - An object containing the advertisement ID, account ID, agent ID, and price required to create a counteroffer. The advertisement ID is used to identify the specific advertisement for which the counteroffer is being made. The account ID is used to identify the account making the original offer that is being countered. The agent ID is used to ensure that the counteroffer is associated with the correct agent. The price is used to set the value of
 * the counteroffer. If any validation fails or if there are issues during the transaction, an error is thrown with an appropriate message indicating the reason for the failure.
 * @return - A Promise that resolves to an object containing the details of the created counteroffer, including the agent ID, advertisement ID, account ID, rejected offer ID, and the counteroffer details such as its ID, price, status, maker, and creation date. If any validation fails or if there are issues during the transaction, an error is thrown with an appropriate message indicating the reason for the failure.
 */
export async function createAgentCounterOffer({
  advertisementId,
  accountId,
  agentId,
  price,
}: CreateAgentCounterOfferParams): Promise<CreateAgentCounterOfferResult> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();

    const advStatus = await findAdvertisementStatusById(
      advertisementId,
      queryRunner.manager,
    );

    if (!advStatus) {
      throw new Error("ADVERTISEMENT_NOT_FOUND");
    }

    if (advStatus !== "active") {
      throw new Error("ADVERTISEMENT_NOT_ACTIVE");
    }

    const lastAccountOffer =
      await findLatestPendingAccountOfferForAdvertisementAndAccount(
        { advertisementId, agentId, accountId },
        queryRunner.manager,
      );

    if (!lastAccountOffer) {
      throw new Error("PENDING_ACCOUNT_OFFER_NOT_FOUND");
    }

    await rejectOfferById(lastAccountOffer.id, queryRunner.manager);

    const counterOffer = await createCounterOffer(
      {
        price,
        advertisementId,
        accountId,
        agentId,
      },
      queryRunner.manager,
    );

    await queryRunner.commitTransaction();

    return {
      agentId,
      advertisementId,
      accountId,
      rejectedOfferId: lastAccountOffer.id,
      counterOffer: {
        id: counterOffer.id,
        price: counterOffer.price,
        status: counterOffer.status,
        madeBy: counterOffer.madeBy,
        createdAt: counterOffer.createdAt,
      },
    };
  } catch (error) {
    if (queryRunner.isTransactionActive) {
      await queryRunner.rollbackTransaction();
    }
    throw error;
  } finally {
    await queryRunner.release();
  }
}

