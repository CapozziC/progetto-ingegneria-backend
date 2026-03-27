import {
  Advertisement,
  Type,
  Status as AdvStatus,
} from "../entities/advertisement.js";
import { Appointment, Status as AppStatus } from "../entities/appointment.js";
import { AppDataSource } from "../data-source.js";
import { In, Not } from "typeorm";
import { Status, Offer, OfferMadeBy } from "../entities/offer.js";
import {
  AcceptAgentOfferAsAccountParams,
  AcceptAgentOfferAsAccountResult,
  CounterAgentOfferAsAccountParams,
  CounterAgentOfferAsAccountResult,
} from "../types/offer.type.js";

/**
 * Accepts an offer made by an agent for a specific account and advertisement.
 * @param param0  - An object containing the advertisement ID and account ID.
 * @returns   An object containing details about the accepted offer and the updated advertisement status.
 * @throws  Will throw an error if the advertisement is not found, not for sale, or not active, if the agent offer is not found, or if the offer price is invalid.
 * @description This function performs a series of operations within a database transaction to ensure data integrity. It first retrieves the relevant advertisement and agent offer, checks their validity, updates the offer status to accepted, marks the advertisement as sold, rejects any other pending offers for the same advertisement, and cancels any related appointments. Finally, it commits the transaction and returns the result.
 */
export async function acceptAgentOfferAsAccount({
  advertisementId,
  accountId,
}: AcceptAgentOfferAsAccountParams): Promise<AcceptAgentOfferAsAccountResult> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();

    const offerRepo = queryRunner.manager.getRepository(Offer);
    const advRepo = queryRunner.manager.getRepository(Advertisement);
    const appointmentRepo = queryRunner.manager.getRepository(Appointment);

    const advertisement = await advRepo.findOne({
      where: { id: advertisementId },
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

    const lastAgentOffer = await offerRepo.findOne({
      where: {
        advertisementId,
        accountId,
        status: Status.PENDING,
        madeBy: OfferMadeBy.AGENT,
      },
      order: { createdAt: "DESC" },
      lock: { mode: "pessimistic_write" },
    });

    if (!lastAgentOffer) {
      throw new Error("AGENT_OFFER_NOT_FOUND");
    }

    const soldPrice = Number(lastAgentOffer.price);
    if (!Number.isFinite(soldPrice) || soldPrice <= 0) {
      throw new Error("INVALID_OFFER_PRICE");
    }

    lastAgentOffer.status = Status.ACCEPTED;
    await offerRepo.save(lastAgentOffer);

    advertisement.status = AdvStatus.SOLD;
    advertisement.soldPrice = soldPrice;
    advertisement.soldAt = new Date();
    await advRepo.save(advertisement);

    await offerRepo.update(
      {
        advertisementId,
        id: Not(lastAgentOffer.id),
        status: Status.PENDING,
      },
      { status: Status.REJECTED },
    );

    await appointmentRepo.update(
      {
        advertisementId,
        status: In([AppStatus.REQUESTED, AppStatus.CONFIRMED]),
      },
      { status: AppStatus.CANCELLED },
    );

    await queryRunner.commitTransaction();

    return {
      acceptedOfferId: lastAgentOffer.id,
      advertisementId,
      advertisementStatus: AdvStatus.SOLD,
      soldPrice,
      soldAt: advertisement.soldAt,
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
/**
 * Counters an agent's offer for a specific account and advertisement by creating a new offer with the provided price and rejecting the previous agent offer.
 * @param param0  - An object containing the advertisement ID, account ID, and the new price for the counteroffer.
 * @returns   An object containing details about the rejected agent offer and the new counteroffer.
 * @throws  Will throw an error if the agent offer is not found or if there is an issue with the database transaction.
 * @description This function performs a series of operations within a database transaction to ensure data integrity. It first retrieves the latest pending agent offer for the specified advertisement and account, checks its existence, updates its status to rejected, creates a new offer as a counteroffer from the account, saves it to the database, commits the transaction, and returns details about both the rejected offer and the new counteroffer.
 */
export async function counterAgentOfferAsAccount({
  advertisementId,
  accountId,
  price,
}: CounterAgentOfferAsAccountParams): Promise<CounterAgentOfferAsAccountResult> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();

    const offerRepo = queryRunner.manager.getRepository(Offer);

    const lastAgentOffer = await offerRepo.findOne({
      where: {
        advertisementId,
        accountId,
        status: Status.PENDING,
        madeBy: OfferMadeBy.AGENT,
      },
      order: { createdAt: "DESC" },
      lock: { mode: "pessimistic_write" },
    });

    if (!lastAgentOffer) {
      throw new Error("AGENT_OFFER_NOT_FOUND");
    }

    lastAgentOffer.status = Status.REJECTED;
    await offerRepo.save(lastAgentOffer);

    const newAccountOffer = offerRepo.create({
      advertisementId,
      accountId,
      agentId: lastAgentOffer.agentId,
      price,
      madeBy: OfferMadeBy.ACCOUNT,
      status: Status.PENDING,
    });

    await offerRepo.save(newAccountOffer);

    await queryRunner.commitTransaction();

    return {
      rejectedOfferId: lastAgentOffer.id,
      counterOfferId: newAccountOffer.id,
      advertisementId,
      accountId,
      agentId: newAccountOffer.agentId,
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
