import express from "express";
const router = express.Router();
import { authenticationMiddlewareAgent } from "../middleware/auth.agent.middleware.js";
import {
  validateBody,
  validateParams,
} from "../middleware/validate.middleware.js";
import {
  createAgentSchema,
  deleteAgentParamsSchema,
  updatePhoneNumberSchema,
} from "../validations/agent.validation.js";
import {
  createNewAgent,
  deleteAgent,
  getAgentAdvByAgentId,
  updatePhoneNumberAgent,
} from "../controllers/agent.controller.js";

import { getAppointmentsForAgent } from "../controllers/appointment.controller.js";
import {
  getOffersForAccountAsAgent,
  getOffersForAdvertisementAsAgent,
} from "../controllers/offer.controller.js";

router.post(
  "/create_agent",
  authenticationMiddlewareAgent,
  validateBody(createAgentSchema),
  createNewAgent,
);
router.delete(
  "/delete/:id",
  authenticationMiddlewareAgent,
  validateParams(deleteAgentParamsSchema),
  deleteAgent,
);
router.get("/me/advertisement", authenticationMiddlewareAgent, getAgentAdvByAgentId);
router.patch(
  "/me/phoneNumber",
  authenticationMiddlewareAgent,
  validateBody(updatePhoneNumberSchema),
  updatePhoneNumberAgent,
);
// Route to get appointments for the authenticated agent
router.get(
  "/me/appointments",
  authenticationMiddlewareAgent,
  getAppointmentsForAgent,
);
// Route to get offers for the authenticated agent
router.get(
  "/offers/advertisement/:id",
  authenticationMiddlewareAgent,
  getOffersForAdvertisementAsAgent,
);
router.get(
  "/offers/account/:id",
  authenticationMiddlewareAgent,
  getOffersForAccountAsAgent,
);



export default router;
