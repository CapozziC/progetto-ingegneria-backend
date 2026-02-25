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
} from "../repositories/offer.repository.js";
import { OfferMadeBy, Status } from "../entities/offer.js";
import { AppDataSource } from "../data-source.js";

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
//completare
export const agentAcceptOffer = async (req: RequestAgent, res: Response) => {
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
    offer.status = Status.ACCEPTED;
    await saveOffer(offer);
    return res.status(200).json({ message: "Offer accepted successfully" });
  } catch (error) {
    console.error("Error accepting offer:", error);
    return res.status(500).json({ error: "Failed to accept offer" });
  }
};

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

export const rejectOfferAndCreateCounterOfferAsAgent = async (
  req: RequestAgent,
  res: Response,
) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    const agent = requireAgent(req, res);
    if (!agent) return;

    const offerId = parsePositiveInt(req.params.id);
    if (!offerId) {
      return res.status(400).json({ error: "Invalid offer id" });
    }

    const { price } = req.body;
    if (!price || typeof price !== "number" || price <= 0) {
      return res.status(400).json({ error: "Invalid price" });
    }

    await queryRunner.startTransaction();

    const offer = await findOfferByIdForAgent(offerId, agent.id);
    if (!offer) {
      await queryRunner.rollbackTransaction();
      return res.status(404).json({ error: "Offer not found" });
    }

    if (offer.status !== Status.PENDING) {
      await queryRunner.rollbackTransaction();
      return res
        .status(400)
        .json({ error: "Only pending offers can be rejected" });
    }

    if (offer.madeBy !== OfferMadeBy.ACCOUNT) {
      await queryRunner.rollbackTransaction();
      return res.status(400).json({
        error: "Counteroffer can only be made for offers made by accounts",
      });
    }

    const advStatus = await findAdvertisementStatusById(
      offer.advertisementId,
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

    await rejectOfferById(offer.id, queryRunner.manager);
    const counterOffer = await createCounterOffer(
      {
        price,
        advertisementId: offer.advertisementId,
        accountId: offer.accountId,
        agentId: offer.agentId,
      },
      queryRunner.manager,
    );

    await queryRunner.commitTransaction();

    return res.status(201).json({
      agentId: agent.id,
      advertisementId: offer.advertisementId,
      accountId: offer.accountId,
      rejectedOfferId: offer.id,
      counterOffer: {
        offerId: counterOffer.id,
        price: counterOffer.price,
        status: counterOffer.status,
        madeBy: counterOffer.madeBy,
        createdAt: counterOffer.createdAt.toISOString(),
      },
    });
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error("Error rejecting offer and creating counteroffer:", error);
    return res
      .status(500)
      .json({ error: "Failed to reject offer and create counteroffer" });
  } finally {
    await queryRunner.release();
  }
};
