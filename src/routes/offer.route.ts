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

const router = express.Router();

router.post(
  "/agents/:id/accept",
  authenticationMiddlewareAgent,
  agentAcceptOffer,
);
router.post(
  "/agents/:id/reject",
  authenticationMiddlewareAgent,
  agentRejectOffer,
);
router.post(
  "/agents/:advertisementId/:accountId/offer/counter",
  authenticationMiddlewareAgent,
  rejectLatestAccountOfferAndCreateCounterOfferAsAgent,
);
// Routes for accounts to accept/reject/counter agent offers
router.post(
  "/account/advertisements/:advertisementId/offers/agent/accept",
  authenticationMiddlewareAccount,
  accountAcceptAgentOffer,
);

router.post(
  "/account/advertisements/:advertisementId/offers/agent/reject",
  authenticationMiddlewareAccount,
  accountRejectAgentOffer,
);

router.post(
  "/account/advertisements/:advertisementId/offers/agent/counter",
  authenticationMiddlewareAccount,
  accountRejectAgentOfferAndCreateCounter,
);

export default router;
