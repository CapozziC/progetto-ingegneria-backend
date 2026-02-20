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
router.get("/myAdv", authenticationMiddlewareAgent, getAgentAdvByAgentId);
router.patch(
  "/update/phoneNumber",
  authenticationMiddlewareAgent,
  validateBody(updatePhoneNumberSchema),
  updatePhoneNumberAgent,
);
router.get(
  "/my_appointments",
  authenticationMiddlewareAgent,
  getAppointmentsForAgent,
);

export default router;
