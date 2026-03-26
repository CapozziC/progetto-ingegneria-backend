import express from "express";
import { authenticationMiddlewareAgent } from "../middleware/auth.agent.middleware.js";
import {
  accountAcceptAgentOffer,
  accountRejectAgentOffer,
  accountRejectAgentOfferAndCreateCounter,
  agentAcceptOffer,
  agentRejectOffer,
  rejectLatestAccountOfferAndCreateCounterOfferAsAgent,
} from "../controllers/offer.controller.js";
import { authenticationMiddlewareAccount } from "../middleware/auth.account.middleware.js";
import {
  validateParams,
  validateBody,
} from "../middleware/validate.middleware.js";
import {
  counterOfferParamsSchema,
  OfferParamsSchema,
  counterOfferBodySchema,
} from "../validations/offer.validation.js";

const router = express.Router();

router.post(
  "/agents/:id/accept",
  authenticationMiddlewareAgent,
  validateParams(OfferParamsSchema),
  agentAcceptOffer,
);
router.post(
  "/agents/:id/reject",
  authenticationMiddlewareAgent,
  validateParams(OfferParamsSchema),
  agentRejectOffer,
);
router.post(
  "/agents/:advertisementId/:accountId/offer/counter",
  authenticationMiddlewareAgent,
  validateParams(counterOfferParamsSchema),
  validateBody(counterOfferBodySchema),
  rejectLatestAccountOfferAndCreateCounterOfferAsAgent,
);
// Routes for accounts to accept/reject/counter agent offers
router.post(
  "/accounts/:offerId/accept",
  authenticationMiddlewareAccount,
  validateParams(OfferParamsSchema),
  accountAcceptAgentOffer,
);

router.post(
  "/accounts/:offerId/reject",
  authenticationMiddlewareAccount,
  validateParams(OfferParamsSchema),
  accountRejectAgentOffer,
);

router.post(
  "/account/advertisements/:advertisementId/offers/agent/counter",
  authenticationMiddlewareAccount,
  validateParams(OfferParamsSchema),
  validateBody(counterOfferBodySchema),
  accountRejectAgentOfferAndCreateCounter,
);

export default router;
