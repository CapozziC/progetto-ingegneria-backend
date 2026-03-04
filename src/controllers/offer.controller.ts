import { RequestAccount, RequestAgent } from "../types/express.js";
import { Response } from "express";
import { requireAccount, requireAgent } from "../utils/require.utils.js";
import { parsePositiveInt } from "../utils/objectParse.utils.js";
import {
  findAdvertisementOwnerId,
  findAdvertisementStatusById,
} from "../repositories/advertisement.repository.js";
import {
  createCounterOffer,
  createOffer,
  existPendingOfferByAdvertisementIdAndAccountId,
  findAllOffersByAccountIdByAgentId,
  findAllOffersForAdvertisementByAgent,
  findOfferByIdForAgent,
  rejectOfferById,
  saveOffer,
  findLatestPendingAccountOfferForAdvertisementAndAccount,
} from "../repositories/offer.repository.js";

import { Status as AdvStatus } from "../entities/advertisement.js";
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

/**
 *  Get all offers for a specific advertisement if the authenticated agent is the owner of the advertisement
 * @param req RequestAgent with params containing advertisement id
 * @param res Response with offers or error message
 * @returns JSON with offers or error message
 */
export const getOffersForAdvertisementAsAgent = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    const agent = requireAgent(req, res);
    if (!agent) return;
    const agentId = agent.id;
    const advertisementId = parsePositiveInt(req.params.id);
    if (!advertisementId) {
      return res.status(400).json({ error: "Invalid advertisement id" });
    }
    const ownerId = await findAdvertisementOwnerId(advertisementId);
    if (ownerId !== agentId) {
      return res
        .status(403)
        .json({ error: "You are not the owner of this advertisement" });
    }
    const offers = await findAllOffersForAdvertisementByAgent(
      advertisementId,
      ownerId,
    );

    return res.status(200).json({
      agentId: agent.id,
      advertisementId,
      offers: offers.map((o) => ({
        offerId: o.id,
        price: o.price,
        status: o.status,
        madeBy: o.madeBy,
        createdAt: o.createdAt.toISOString(),
        accountId: o.accountId,
      })),
    });
  } catch (error) {
    console.error("Error getting offers for agent:", error);
    return res.status(500).json({ error: "Failed to get offers for agent" });
  }
};

/**
 *  Get all offers made to the authenticated agent for a specific account
 * @param req RequestAgent with params containing account id
 * @param res Response with offers or error message
 * @returns JSON with offers or error message
 */
export const getOffersForAccountAsAgent = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    const agent = requireAgent(req, res);
    if (!agent) return;
    const agentId = agent.id;
    const accountId = parsePositiveInt(req.params.id);
    if (!accountId) {
      return res.status(400).json({ error: "Invalid account id" });
    }

    const offers = await findAllOffersByAccountIdByAgentId(accountId, agentId);
    return res.status(200).json({
      agentId,
      accountId,
      offers: offers.map((o) => ({
        offerId: o.id,
        price: o.price,
        status: o.status,
        madeBy: o.madeBy,
        createdAt: o.createdAt.toISOString(),
        advertisementId: o.advertisementId,
      })),
    });
  } catch (error) {
    console.error("Error getting offers for account as agent:", error);
    return res
      .status(500)
      .json({ error: "Failed to get offers for account as agent" });
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

    // Lock the offer row for update to prevent concurrent modifications
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
    //Verify offer is pending
    if (offer.status !== Status.PENDING) {
      await queryRunner.rollbackTransaction();
      return res
        .status(400)
        .json({ error: "Only pending offers can be accepted" });
    }
    //lock the advertisement row for update to prevent concurrent modifications
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
    //Verify advertisement is active
    if (advertisement.status !== "active") {
      await queryRunner.rollbackTransaction();
      return res.status(409).json({
        error: "Only offers for active advertisements can be accepted",
      });
    }
    advertisement.status = AdvStatus.SOLD;
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
    return res.status(200).json({
      ok: true,
      acceptedOfferId: offer.id,
      advertisementId: offer.advertisementId,
      advertisementStatus: AdvStatus.SOLD,
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

    if (advertisement.status !== AdvStatus.ACTIVE) {
      await queryRunner.rollbackTransaction();
      return res.status(409).json({
        error: "Only offers for active advertisements can be accepted",
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
