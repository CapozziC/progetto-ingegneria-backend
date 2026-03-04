import express from "express";
import { authenticationMiddlewareAgent } from "../middleware/auth.agent.middleware.js";
import {
  agentAcceptOffer,
  agentRejectOffer,
  rejectLatestAccountOfferAndCreateCounterOfferAsAgent,
} from "../controllers/offer.controller.js";

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
  "/offer/agents/:advertisementId/:accountId/offer/counter",
  authenticationMiddlewareAgent,
  rejectLatestAccountOfferAndCreateCounterOfferAsAgent,
);


export default router;
