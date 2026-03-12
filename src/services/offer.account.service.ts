import { Offer } from "../entities/offer.js";
import { Advertisement } from "../entities/advertisement.js";
import { Appointment } from "../entities/appointment.js";
import { AppDataSource } from "../data-source.js";
import { In, Not } from "typeorm";
import { Type } from "../entities/advertisement.js";
import { Status as AdvStatus } from "../entities/advertisement.js";
import { Status as AppStatus } from "../entities/appointment.js";
import { Status } from "../entities/offer.js";
import { OfferMadeBy } from "../entities/offer.js";
import {
  AcceptAgentOfferAsAccountParams,
  AcceptAgentOfferAsAccountResult,
  CounterAgentOfferAsAccountParams,
  CounterAgentOfferAsAccountResult,
} from "../types/offer.type.js";
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
