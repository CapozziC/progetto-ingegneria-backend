import { RequestAccount, RequestAgent } from "../types/express.js";
import { Response } from "express";
import {
  requireAccount,
  requireAgent,
} from "../middleware/require.middleware.js";
import { parsePositiveInt } from "../utils/parse.utils.js";
import {
  findAdvertisementOwnerId,
  searchAdvertisementById,
} from "../repositories/advertisement.repository.js";
import {
  createOffer,
  existPendingOfferByAdvertisementIdAndAccountId,
  findOfferByIdForAgent,
  saveOffer,
  findAdvertisementWithOfferId,
} from "../repositories/offer.repository.js";
import {
  Status as AdvStatus,
  Type,
  Advertisement,
} from "../entities/advertisement.js";
import { Status as AppStatus, Appointment } from "../entities/appointment.js";
import { Status, OfferMadeBy, Offer } from "../entities/offer.js";
import { AppDataSource } from "../data-source.js";
import { In } from "typeorm";
import {
  createAgentCounterOffer,
  acceptOfferByAgent,
} from "../services/offer.agent.service.js";
import {
  acceptAgentOfferAsAccount,
  counterAgentOfferAsAccount,
} from "../services/offer.account.service.js";
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
  try {
    const agent = requireAgent(req, res);
    if (!agent) return;

    const offerId = parsePositiveInt(req.params.id);
    if (!offerId) {
      return res.status(400).json({ error: "Invalid offer id" });
    }

    const result = await acceptOfferByAgent({
      offerId,
      agentId: agent.id,
    });

    return res.status(200).json({
      ok: true,
      acceptedOfferId: result.offerId,
      advertisementId: result.advertisementId,
      advertisementStatus: result.advertisementStatus,
      soldPrice: result.soldPrice,
      soldAt: result.soldAt,
    });
  } catch (error) {
    console.error("Error accepting offer:", error);

    if (error instanceof Error) {
      switch (error.message) {
        case "OFFER_NOT_FOUND":
          return res.status(404).json({ error: "Offer not found" });

        case "FORBIDDEN_OFFER":
          return res
            .status(403)
            .json({ error: "You are not the owner of this offer" });

        case "OFFER_NOT_PENDING":
          return res.status(400).json({
            error: {
              message: "Only pending offers can be accepted",
            },
          });

        case "INVALID_OFFER_PRICE":
          return res.status(400).json({
            error: {
              message: "Invalid offer price",
            },
          });

        case "ADVERTISEMENT_NOT_FOUND":
          return res.status(404).json({
            error: {
              message: "Associated advertisement not found",
            },
          });

        case "ADVERTISEMENT_NOT_SALE":
          return res.status(409).json({
            error: {
              message: "Only offers for sale advertisements can be accepted",
            },
          });

        case "ADVERTISEMENT_NOT_ACTIVE":
          return res.status(409).json({
            error: {
              message: "Only offers for active advertisements can be accepted",
            },
          });
      }
    }

    return res
      .status(500)
      .json({ error: { message: "Failed to accept offer" } });
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
      return res.status(403).json({
        error: {
          message: "You are not the owner of this offer",
        },
      });
    }
    offer.status = Status.REJECTED;
    await saveOffer(offer);
    return res
      .status(200)
      .json({ error: { message: "Offer rejected successfully" } });
  } catch (error) {
    console.error("Error rejecting offer:", error);
    return res
      .status(500)
      .json({ error: { message: "Failed to reject offer" } });
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
  try {
    const agent = requireAgent(req, res);
    if (!agent) return;

    const advertisementId = parsePositiveInt(req.params.advertisementId);
    if (!advertisementId) {
      return res
        .status(400)
        .json({ error: { message: "Invalid advertisement id" } });
    }

    const accountId = parsePositiveInt(req.params.accountId);
    if (!accountId) {
      return res.status(400).json({ error: { message: "Invalid account id" } });
    }

    const { price } = req.body;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: { message: "Invalid price" } });
    }

    const result = await createAgentCounterOffer({
      advertisementId,
      accountId,
      agentId: agent.id,
      price,
    });

    return res.status(201).json({
      agentId: result.agentId,
      advertisementId: result.advertisementId,
      accountId: result.accountId,
      rejectedOfferId: result.rejectedOfferId,
      counterOffer: {
        offerId: result.counterOffer.id,
        price: result.counterOffer.price,
        status: result.counterOffer.status,
        madeBy: result.counterOffer.madeBy,
        createdAt: result.counterOffer.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error creating counteroffer:", error);

    if (error instanceof Error) {
      switch (error.message) {
        case "ADVERTISEMENT_NOT_FOUND":
          return res
            .status(404)
            .json({ error: { message: "Associated advertisement not found" } });

        case "ADVERTISEMENT_NOT_ACTIVE":
          return res.status(409).json({
            error: {
              message:
                "Counteroffer can only be made for active advertisements",
            },
          });

        case "PENDING_ACCOUNT_OFFER_NOT_FOUND":
          return res.status(409).json({
            error: {
              message:
                "No pending account offer found for this account to counter (agent can only counter account offers)",
            },
          });
      }
    }

    return res.status(500).json({ error: "Failed to create counteroffer" });
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
  try {
    const account = requireAccount(req, res);
    if (!account) return;

    const offerId = parsePositiveInt(req.params.id);
    if (!offerId) {
      return res.status(400).json({ error: { message: "Invalid offer id" } });
    }

    const advertisementId = await findAdvertisementWithOfferId(offerId);
    if (!advertisementId) {
      return res
        .status(400)
        .json({ error: { message: "Invalid advertisement id" } });
    }

    const result = await acceptAgentOfferAsAccount({
      advertisementId,
      accountId: account.id,
    });

    return res.status(200).json({
      ok: true,
      acceptedOfferId: result.acceptedOfferId,
      advertisementId: result.advertisementId,
      advertisementStatus: result.advertisementStatus,
      soldPrice: result.soldPrice,
      soldAt: result.soldAt,
    });
  } catch (error) {
    console.error("Error accepting agent offer as account:", error);

    if (error instanceof Error) {
      switch (error.message) {
        case "ADVERTISEMENT_NOT_FOUND":
          return res
            .status(404)
            .json({ error: { message: "Associated advertisement not found" } });

        case "ADVERTISEMENT_NOT_SALE":
          return res.status(409).json({
            error: {
              message: "Only offers for sale advertisements can be accepted",
            },
          });

        case "ADVERTISEMENT_NOT_ACTIVE":
          return res.status(409).json({
            error: {
              message: "Only active sale advertisements can accept offers",
            },
          });

        case "AGENT_OFFER_NOT_FOUND":
          return res.status(409).json({
            error: { message: "No pending agent offer found to accept" },
          });

        case "INVALID_OFFER_PRICE":
          return res
            .status(400)
            .json({ error: { message: "Invalid offer price" } });
      }
    }

    return res
      .status(500)
      .json({ error: { message: "Failed to accept  offer" } });
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

    const offerId = parsePositiveInt(req.params.id);
    if (!offerId) {
      return res.status(400).json({ error: { message: "Invalid offer id" } });
    }
    const advertisementId = await findAdvertisementWithOfferId(offerId);
    if (!advertisementId) {
      return res
        .status(400)
        .json({ error: { message: "Invalid advertisement id" } });
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
        .json({ error: { message: "No pending agent offer found to reject" } });
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
    return res
      .status(500)
      .json({ error: { message: "Failed to accept  offer" } });
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
  try {
    const account = requireAccount(req, res);
    if (!account) return;

    const advertisementId = parsePositiveInt(req.params.advertisementId);
    if (!advertisementId) {
      return res
        .status(400)
        .json({ error: { message: "Invalid advertisement id" } });
    }

    const { price } = req.body;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: { message: "Invalid price" } });
    }

    const result = await counterAgentOfferAsAccount({
      advertisementId,
      accountId: account.id,
      price,
    });

    return res.status(201).json({
      ok: true,
      rejectedOfferId: result.rejectedOfferId,
      counterOfferId: result.counterOfferId,
      advertisementId: result.advertisementId,
      accountId: result.accountId,
      agentId: result.agentId,
    });
  } catch (error) {
    console.error("Error countering agent offer as account:", error);

    if (error instanceof Error && error.message === "AGENT_OFFER_NOT_FOUND") {
      return res.status(409).json({
        error: {
          message:
            " No pending agent offer found to counter (account can only counter agent offers)",
        },
      });
    }

    return res
      .status(500)
      .json({ error: { message: "Failed to counter agent offer" } });
  }
};

/**
 *  Mark an advertisement as rented, only if the authenticated agent is the owner of the advertisement and the advertisement is of type rent
 * @param req RequestAgent with params containing advertisement id
 * @param res Response with success or error message
 * @returns JSON with success or error message
 */
export const markAdvertisementAsRented = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    const agent = requireAgent(req, res);
    if (!agent) return;

    const advertisementId = parsePositiveInt(req.params.advertisementId);
    if (!advertisementId) {
      return res.status(400).json({ error:{ message: "Invalid advertisement id" } });
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
        return res.status(404).json({ error:{ message: "Advertisement not found" } });
      }

      if (advertisement.agent.id !== agent.id) {
        return res
          .status(403)
          .json({ error: { message: "You are not the owner of this advertisement" } });
      }

      if (advertisement.type !== Type.RENT) {
        return res.status(409).json({
          error: { message: "Only rental advertisements can be marked as rented" },
        });
      }

      if (advertisement.status !== AdvStatus.ACTIVE) {
        return res.status(409).json({
          error: { message: "Only active advertisements can be marked as rented" },
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
      .json({ error: { message: "Failed to mark advertisement as rented" } });
  }
};
