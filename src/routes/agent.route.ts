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
  updatePasswordAgentParamsSchema,
  updatePasswordAgentBodySchema,
  updatePhoneNumberSchema,
  agentCreateAccountAndExternalOfferBodySchema,
} from "../validations/agent.validation.js";
import {
  createNewAgent,
  deleteAgent,
  getAgentAdvertisements,
  getAgentNegotiations,
  getAgentNegotiationByAdvertisementAndAccount,
  updatePhoneNumberAgent,
  getAgentProfile,
  updateAgentPassword,
  deleteFirstAgentAndAgency,
  getAllAgentCreatedByLoggedAdmin,
  getAgentAdvertisementById,
  agentCreateAccountAndExternalOffer,
} from "../controllers/agent.controller.js";
import { getAppointmentsForAgent } from "../controllers/appointment.controller.js";
import { markAdvertisementAsRented } from "../controllers/offer.controller.js";


router.get("/me/info", authenticationMiddlewareAgent, getAgentProfile);

router.post(
  "/create_agent",
  authenticationMiddlewareAgent,
  validateBody(createAgentSchema),
  createNewAgent,
);

router.delete(
  "/delete/:agentId",
  authenticationMiddlewareAgent,
  validateParams(deleteAgentParamsSchema),
  deleteAgent,
);

router.delete(
  "/delete/:agentId/founder",
  authenticationMiddlewareAgent,
  validateParams(deleteAgentParamsSchema),
  deleteFirstAgentAndAgency,
);

router.get(
  "/advertisements",
  authenticationMiddlewareAgent,
  getAgentAdvertisements,
);

router.get(
  "/advertisement/:advertisementId",
  authenticationMiddlewareAgent,
  getAgentAdvertisementById,
);

router.patch(
  "/me/phoneNumber",
  authenticationMiddlewareAgent,
  validateBody(updatePhoneNumberSchema),
  updatePhoneNumberAgent,
);

router.get(
  "/agents",
  authenticationMiddlewareAgent,
  getAllAgentCreatedByLoggedAdmin,
);

router.patch(
  "/:agentId/password",
  authenticationMiddlewareAgent,
  validateParams(updatePasswordAgentParamsSchema),
  validateBody(updatePasswordAgentBodySchema),
  updateAgentPassword,
);

// Route to get appointments for the authenticated agent
router.get(
  "/appointments",
  authenticationMiddlewareAgent,
  getAppointmentsForAgent,
);
//ROUTE FOR GETTING OFFER NEGOTIATIONS
router.get(
  "/negotiations/:advertisementId/:accountId",
  authenticationMiddlewareAgent,
  getAgentNegotiationByAdvertisementAndAccount,
);

router.get(
  "/negotiations",
  authenticationMiddlewareAgent,
  getAgentNegotiations,
);

router.patch(
  "/:advertisementId/rented",
  authenticationMiddlewareAgent,
  markAdvertisementAsRented,
);

router.post(
  "/create_external_offer/:advertisementId",
  authenticationMiddlewareAgent,
  validateBody(agentCreateAccountAndExternalOfferBodySchema),
  agentCreateAccountAndExternalOffer,
);

export default router;
