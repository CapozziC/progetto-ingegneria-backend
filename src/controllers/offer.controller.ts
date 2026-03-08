import { RequestAccount, RequestAgent } from "../types/express.js";
import { Response } from "express";
import { requireAccount, requireAgent } from "../utils/require.utils.js";
import { parsePositiveInt } from "../utils/objectParse.utils.js";
import {
  findAdvertisementOwnerId,
  findAdvertisementStatusById,
  searchAdvertisementById,
} from "../repositories/advertisement.repository.js";
import {
  createCounterOffer,
  createOffer,
  existPendingOfferByAdvertisementIdAndAccountId,
  findOfferByIdForAgent,
  rejectOfferById,
  saveOffer,
  findLatestPendingAccountOfferForAdvertisementAndAccount,
} from "../repositories/offer.repository.js";

import { Status as AdvStatus, Type } from "../entities/advertisement.js";
import { Status as AppStatus } from "../entities/appointment.js";
import { Status, OfferMadeBy } from "../entities/offer.js";
import { Advertisement } from "../entities/advertisement.js";
import { Appointment } from "../entities/appointment.js";
import { Offer } from "../entities/offer.js";
import { AppDataSource } from "../data-source.js";
import { In, Not } from "typeorm";

/**
 *  Create a new offer for an advertisement by an account
 * @param req RequestAccount with body containing price and params containing advertisement id
 * @param res  Response with created offer or error message
 * @returns  JSON with created offer or error message
 */
export const createOfferByAccount = async (
  req: RequestAccount,
  res: Response,
) => {
  try {
    const account = requireAccount(req, res);
    if (!account) return;
    const advertisementId = parsePositiveInt(req.params.id);
    if (!advertisementId) {
      return res.status(400).json({ error: "Invalid advertisement id" });
    }

    const advertisement = await searchAdvertisementById(advertisementId);
    if (!advertisement) {
      return res.status(404).json({ error: "Advertisement not found" });
    }
    if (advertisement.type !== Type.SALE) {
      return res
        .status(409)
        .json({ error: "Offers can only be made for sale advertisements" });
    }

    const { price } = req.body;
    if (!price || typeof price !== "number" || price <= 0) {
      return res.status(400).json({ error: "Invalid price" });
    }
    const agentId = await findAdvertisementOwnerId(advertisementId);
    if (!agentId) {
      return res.status(404).json({ error: "Advertisement owner not found" });
    }
    const existingOffer = await existPendingOfferByAdvertisementIdAndAccountId(
      advertisementId,
      account.id,
    );
    if (existingOffer) {
      return res.status(409).json({
        error: "You already have a pending offer for this advertisement",
      });
    }
    const offer = createOffer({
      price,
      advertisementId,
      accountId: account.id,
      agentId,
    });
    const savedOffer = await saveOffer(offer);
    return res.status(201).json({ offer: savedOffer });
  } catch (error) {
    console.error("Error creating offer:", error);
    return res.status(500).json({ error: "Failed to create offer" });
  }
};

//Agent accept/reject offer and counteroffer
/**
 * Accept an offer as an agent, changing the offer status to accepted, the related advertisement status to sold, rejecting all other pending offers for the same advertisement and cancelling all appointments related to the same advertisement, in a single transaction
 * @param req RequestAgent with params containing offer id
 * @param res Response with success message or error message
 * @returns JSON with success message or error message
 */
export const agentAcceptOffer = async (req: RequestAgent, res: Response) => {
  const agent = requireAgent(req, res);
  if (!agent) return;

  const offerId = parsePositiveInt(req.params.id);
  if (!offerId) {
    return res.status(400).json({ error: "Invalid offer id" });
  }

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();

    const offerRepo = queryRunner.manager.getRepository(Offer);
    const advRepo = queryRunner.manager.getRepository(Advertisement);
    const appointmentRepo = queryRunner.manager.getRepository(Appointment);

    // Lock offer row
    const offer = await offerRepo.findOne({
      where: { id: offerId, agentId: agent.id },
      lock: { mode: "pessimistic_write" },
    });

    if (!offer) {
      await queryRunner.rollbackTransaction();
      return res.status(404).json({ error: "Offer not found" });
    }
    //Verify owner of the offer
    if (offer.agentId !== agent.id) {
      await queryRunner.rollbackTransaction();
      return res
        .status(403)
        .json({ error: "You are not the owner of this offer" });
    }

    if (offer.status !== Status.PENDING) {
      await queryRunner.rollbackTransaction();
      return res
        .status(400)
        .json({ error: "Only pending offers can be accepted" });
    }

    if (!offer.price || Number(offer.price) <= 0) {
      await queryRunner.rollbackTransaction();
      return res.status(400).json({ error: "Invalid offer price" });
    }

    // Lock advertisement row
    const advertisement = await advRepo.findOne({
      where: { id: offer.advertisementId },
      lock: { mode: "pessimistic_write" },
    });

    if (!advertisement) {
      await queryRunner.rollbackTransaction();
      return res
        .status(404)
        .json({ error: "Associated advertisement not found" });
    }
    if (advertisement.type !== Type.SALE) {
      await queryRunner.rollbackTransaction();
      return res.status(409).json({
        error: "Only offers for sale advertisements can be accepted",
      });
    }

    if (advertisement.status !== "active") {
      await queryRunner.rollbackTransaction();
      return res.status(409).json({
        error: "Only offers for active advertisements can be accepted",
      });
    }

    // ✅ Set SOLD + sale metadata
    advertisement.status = AdvStatus.SOLD;
    advertisement.soldPrice = offer.price;
    advertisement.soldPrice = Number(offer.price);
    if (
      !Number.isFinite(advertisement.soldPrice) ||
      advertisement.soldPrice <= 0
    ) {
      await queryRunner.rollbackTransaction();
      return res.status(400).json({ error: "Invalid offer price" });
    } // prezzo di vendita
    advertisement.soldAt = new Date(); // data di vendita

    await advRepo.save(advertisement);

    // Accept this offer
    offer.status = Status.ACCEPTED;
    await offerRepo.save(offer);

    // Reject all other pending offers for same adv
    await offerRepo.update(
      {
        advertisementId: offer.advertisementId,
        id: Not(offer.id),
        status: Status.PENDING,
      },
      { status: Status.REJECTED },
    );

    // Cancel requested/confirmed appointments for the adv
    await appointmentRepo.update(
      {
        advertisementId: offer.advertisementId,
        status: In([AppStatus.REQUESTED, AppStatus.CONFIRMED]),
      },
      { status: AppStatus.CANCELLED },
    );

    await queryRunner.commitTransaction();

    return res.status(200).json({
      ok: true,
      acceptedOfferId: offer.id,
      advertisementId: offer.advertisementId,
      advertisementStatus: AdvStatus.SOLD,
      soldPrice: offer.price,
      soldAt: advertisement.soldAt,
    });
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error("Error accepting offer:", error);
    return res.status(500).json({ error: "Failed to accept offer" });
  } finally {
    await queryRunner.release();
  }
};
/**
 * Reject an offer as an agent, changing the offer status to rejected
 * @param req RequestAgent with params containing offer id
 * @param res Response with success message or error message
 * @returns JSON with success message or error message
 */
export const agentRejectOffer = async (req: RequestAgent, res: Response) => {
  try {
    const agent = requireAgent(req, res);
    if (!agent) return;
    const offerId = parsePositiveInt(req.params.id);
    if (!offerId) {
      return res.status(400).json({ error: "Invalid offer id" });
    }
    const offer = await findOfferByIdForAgent(offerId, agent.id);
    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }
    if (offer.agentId !== agent.id) {
      return res
        .status(403)
        .json({ error: "You are not the owner of this offer" });
    }
    offer.status = Status.REJECTED;
    await saveOffer(offer);
    return res.status(200).json({ message: "Offer rejected successfully" });
  } catch (error) {
    console.error("Error rejecting offer:", error);
    return res.status(500).json({ error: "Failed to reject offer" });
  }
};
/**
 *  Reject the latest pending offer made by an account for a specific advertisement and create a counteroffer as an agent in a single transaction, only if the authenticated agent is the owner of the advertisement and the offer to reject is made by an account (agent can only counter account offers)
 * @param req RequestAgent with params containing advertisement id and account id and body containing price for the counteroffer
 * @param res Response with created counteroffer or error message
 * @returns JSON with created counteroffer or error message
 */
export const rejectLatestAccountOfferAndCreateCounterOfferAsAgent = async (
  req: RequestAgent,
  res: Response,
) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    const agent = requireAgent(req, res);
    if (!agent) return;

    const advertisementId = parsePositiveInt(req.params.advertisementId);
    if (!advertisementId) {
      return res.status(400).json({ error: "Invalid advertisement id" });
    }

    const accountId = parsePositiveInt(req.params.accountId);
    if (!accountId) {
      return res.status(400).json({ error: "Invalid account id" });
    }
    console.log("PARAMS:", req.params);

    const { price } = req.body;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: "Invalid price" });
    }

    await queryRunner.startTransaction();

    const advStatus = await findAdvertisementStatusById(
      advertisementId,
      queryRunner.manager,
    );
    if (!advStatus) {
      await queryRunner.rollbackTransaction();
      return res
        .status(404)
        .json({ error: "Associated advertisement not found" });
    }
    if (advStatus !== "active") {
      await queryRunner.rollbackTransaction();
      return res.status(409).json({
        error: "Counteroffer can only be made for active advertisements",
      });
    }

    const lastAccountOffer =
      await findLatestPendingAccountOfferForAdvertisementAndAccount(
        { advertisementId, agentId: agent.id, accountId },
        queryRunner.manager,
      );

    if (!lastAccountOffer) {
      await queryRunner.rollbackTransaction();
      return res.status(409).json({
        error:
          "No pending account offer found for this account to counter (agent can only counter account offers)",
      });
    }

    await rejectOfferById(lastAccountOffer.id, queryRunner.manager);

    const counterOffer = await createCounterOffer(
      {
        price,
        advertisementId,
        accountId,
        agentId: agent.id,
      },
      queryRunner.manager,
    );

    await queryRunner.commitTransaction();

    return res.status(201).json({
      agentId: agent.id,
      advertisementId,
      accountId,
      rejectedOfferId: lastAccountOffer.id,
      counterOffer: {
        offerId: counterOffer.id,
        price: counterOffer.price,
        status: counterOffer.status,
        madeBy: counterOffer.madeBy,
        createdAt: counterOffer.createdAt.toISOString(),
      },
    });
  } catch (error) {
    try {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError);
    }

    console.error("Error creating counteroffer:", error);
    return res.status(500).json({ error: "Failed to create counteroffer" });
  } finally {
    await queryRunner.release();
  }
};

//----------------
//ACCOUNT
//----------------

/**
 *  Accept an offer made by an agent, changing the offer status to accepted and the related advertisement status to sold, only if the authenticated account is the recipient of the offer and the offer is made by an agent (account can only accept agent offers)
 * @param req RequestAccount with params containing advertisement id
 * @param res Response with success or error message
 * @returns JSON with success or error message
 */
export const accountAcceptAgentOffer = async (
  req: RequestAccount,
  res: Response,
) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    const account = requireAccount(req, res);
    if (!account) return;

    const advertisementId = parsePositiveInt(req.params.advertisementId);
    if (!advertisementId) {
      return res.status(400).json({ error: "Invalid advertisement id" });
    }

    await queryRunner.startTransaction();

    const offerRepo = queryRunner.manager.getRepository(Offer);
    const advRepo = queryRunner.manager.getRepository(Advertisement);
    const appointmentRepo = queryRunner.manager.getRepository(Appointment);

    // Lock advertisement
    const advertisement = await advRepo.findOne({
      where: { id: advertisementId },
      lock: { mode: "pessimistic_write" },
    });

    if (!advertisement) {
      await queryRunner.rollbackTransaction();
      return res
        .status(404)
        .json({ error: "Associated advertisement not found" });
    }

    if (advertisement.type !== Type.SALE) {
      await queryRunner.rollbackTransaction();
      return res.status(409).json({
        error: "Only offers for sale advertisements can be accepted",
      });
    }
    if (advertisement.status !== AdvStatus.ACTIVE) {
      await queryRunner.rollbackTransaction();
      return res.status(409).json({
        error: "Only offers for sale advertisements can be accepted",
      });
    }

    // Lock ultima controproposta agente
    const lastAgentOffer = await offerRepo.findOne({
      where: {
        advertisementId,
        accountId: account.id,
        status: Status.PENDING,
        madeBy: OfferMadeBy.AGENT,
      },
      order: { createdAt: "DESC" },
      lock: { mode: "pessimistic_write" },
    });

    if (!lastAgentOffer) {
      await queryRunner.rollbackTransaction();
      return res.status(409).json({
        error: "No pending agent offer found to accept",
      });
    }

    //  accetta la controproposta
    lastAgentOffer.status = Status.ACCEPTED;
    await offerRepo.save(lastAgentOffer);

    // metti annuncio SOLD
    advertisement.status = AdvStatus.SOLD;
    advertisement.soldPrice = lastAgentOffer.price;
    if (
      !Number.isFinite(advertisement.soldPrice) ||
      advertisement.soldPrice <= 0
    ) {
      await queryRunner.rollbackTransaction();
      return res.status(400).json({ error: "Invalid offer price" });
    }
    advertisement.soldAt = new Date(); // data di vendita
    await advRepo.save(advertisement);

    // rifiuta tutte le altre pending dello stesso annuncio
    await offerRepo.update(
      {
        advertisementId,
        id: Not(lastAgentOffer.id),
        status: Status.PENDING,
      },
      { status: Status.REJECTED },
    );

    // cancella appuntamenti attivi
    await appointmentRepo.update(
      {
        advertisementId,
        status: In([AppStatus.REQUESTED, AppStatus.CONFIRMED]),
      },
      { status: AppStatus.CANCELLED },
    );

    await queryRunner.commitTransaction();

    return res.status(200).json({
      ok: true,
      acceptedOfferId: lastAgentOffer.id,
      advertisementId,
      advertisementStatus: AdvStatus.SOLD,
    });
  } catch (error) {
    try {
      if (queryRunner.isTransactionActive)
        await queryRunner.rollbackTransaction();
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError);
    }

    console.error("Error accepting agent offer as account:", error);
    return res.status(500).json({ error: "Failed to accept agent offer" });
  } finally {
    await queryRunner.release();
  }
};

/**
 *  Reject the latest pending offer made by an agent for an advertisement, only if the authenticated account is the recipient of the offer and the offer is made by an agent (account can only reject agent offers)
 * @param req RequestAccount with params containing advertisement id
 * @param res Response with success or error message
 * @returns JSON with success or error message
 */
export const accountRejectAgentOffer = async (
  req: RequestAccount,
  res: Response,
) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    const account = requireAccount(req, res);
    if (!account) return;

    const advertisementId = parsePositiveInt(req.params.advertisementId);
    if (!advertisementId) {
      return res.status(400).json({ error: "Invalid advertisement id" });
    }

    await queryRunner.startTransaction();

    const lastAgentOffer = await queryRunner.manager
      .getRepository(Offer)
      .findOne({
        where: {
          advertisementId,
          accountId: account.id,
          status: Status.PENDING,
          madeBy: OfferMadeBy.AGENT,
        },
        order: { createdAt: "DESC" },
        lock: { mode: "pessimistic_write" },
      });

    if (!lastAgentOffer) {
      await queryRunner.rollbackTransaction();
      return res
        .status(409)
        .json({ error: "No pending agent offer found to reject" });
    }

    lastAgentOffer.status = Status.REJECTED;
    await queryRunner.manager.getRepository(Offer).save(lastAgentOffer);

    await queryRunner.commitTransaction();
    return res
      .status(200)
      .json({ ok: true, rejectedOfferId: lastAgentOffer.id });
  } catch (error) {
    try {
      if (queryRunner.isTransactionActive)
        await queryRunner.rollbackTransaction();
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }
    console.error("Error accepting agent offer as account:", error);
    return res.status(500).json({ error: "Failed to accept agent offer" });
  } finally {
    await queryRunner.release();
  }
};
/**
 *  Reject the latest pending offer made by an agent for an advertisement and create a counteroffer, only if the authenticated account is the recipient of the offer and the offer is made by an agent (account can only counter agent offers)
 * @param req RequestAccount with params containing advertisement id and body containing price for the counteroffer
 * @param res Response with created counteroffer or error message
 * @returns JSON with created counteroffer or error message
 */
export const accountRejectAgentOfferAndCreateCounter = async (
  req: RequestAccount,
  res: Response,
) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    const account = requireAccount(req, res);
    if (!account) return;

    const advertisementId = parsePositiveInt(req.params.advertisementId);
    if (!advertisementId) {
      return res.status(400).json({ error: "Invalid advertisement id" });
    }

    const { price } = req.body;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: "Invalid price" });
    }

    await queryRunner.startTransaction();

    // trova ultima offer pending dell’agente nella trattativa
    const lastAgentOffer = await queryRunner.manager
      .getRepository(Offer)
      .findOne({
        where: {
          advertisementId,
          accountId: account.id,
          status: Status.PENDING,
          madeBy: OfferMadeBy.AGENT,
        },
        order: { createdAt: "DESC" },
        lock: { mode: "pessimistic_write" },
      });

    if (!lastAgentOffer) {
      await queryRunner.rollbackTransaction();
      return res.status(409).json({
        error:
          "No pending agent offer found to counter (account can only counter agent offers)",
      });
    }

    // rifiuta la offer agente
    lastAgentOffer.status = Status.REJECTED;
    await queryRunner.manager.getRepository(Offer).save(lastAgentOffer);

    // crea nuova offer account (controproposta)
    const repo = queryRunner.manager.getRepository(Offer);
    const newAccountOffer = repo.create({
      advertisementId,
      accountId: account.id,
      agentId: lastAgentOffer.agentId, // importante: prendi l’agente della trattativa
      price,
      madeBy: OfferMadeBy.ACCOUNT,
      status: Status.PENDING,
    });
    await repo.save(newAccountOffer);

    await queryRunner.commitTransaction();

    return res.status(201).json({
      ok: true,
      rejectedOfferId: lastAgentOffer.id,
      counterOfferId: newAccountOffer.id,
      advertisementId,
      accountId: account.id,
      agentId: newAccountOffer.agentId,
    });
  } catch (error) {
    try {
      if (queryRunner.isTransactionActive)
        await queryRunner.rollbackTransaction();
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }
    console.error("Error countering agent offer as account:", error);
    return res.status(500).json({ error: "Failed to counter agent offer" });
  } finally {
    await queryRunner.release();
  }
};

export const markAdvertisementAsRented = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    const agent = requireAgent(req, res);
    if (!agent) return;

    const advertisementId = parsePositiveInt(req.params.advertisementId);
    if (!advertisementId) {
      return res.status(400).json({ error: "Invalid advertisement id" });
    }

    await AppDataSource.transaction(async (manager) => {
      const advertisementRepo = manager.getRepository(Advertisement);
      const appointmentRepo = manager.getRepository(Appointment);

      const advertisement = await advertisementRepo.findOne({
        where: { id: advertisementId },
        relations: {
          agent: true,
        },
      });

      if (!advertisement) {
        return res.status(404).json({ error: "Advertisement not found" });
      }

      if (advertisement.agent.id !== agent.id) {
        return res
          .status(403)
          .json({ error: "You are not the owner of this advertisement" });
      }

      if (advertisement.type !== Type.RENT) {
        return res.status(409).json({
          error: "Only rental advertisements can be marked as rented",
        });
      }

      if (advertisement.status !== AdvStatus.ACTIVE) {
        return res.status(409).json({
          error: "Only active advertisements can be marked as rented",
        });
      }

      advertisement.status = AdvStatus.RENTED;
      advertisement.rentedAt = new Date();

      await advertisementRepo.save(advertisement);

      await appointmentRepo.update(
        {
          advertisementId,
          status: In([AppStatus.REQUESTED, AppStatus.CONFIRMED]),
        },
        { status: AppStatus.CANCELLED },
      );

      return res.status(200).json({
        ok: true,
        advertisementId: advertisement.id,
        advertisementStatus: advertisement.status,
        rentedAt: advertisement.rentedAt,
      });
    });
  } catch (error) {
    console.error("Error marking advertisement as rented:", error);
    return res
      .status(500)
      .json({ error: "Failed to mark advertisement as rented" });
  }
};
