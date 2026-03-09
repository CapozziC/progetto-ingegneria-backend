import express from "express";
const router = express.Router();

import { authenticationMiddlewareAgent } from "../middleware/auth.agent.middleware.js";
import {
  agentConfirmAppointment,
  agentRejectAppointment,
  accountCancelAppointment,
} from "../controllers/appointment.controller.js";
import { authenticationMiddlewareAccount } from "../middleware/auth.account.middleware.js";
import { validateParams } from "../middleware/validate.middleware.js";
import { AppointmentParamsSchema } from "../validations/appointment.validation.js";

router.patch(
  "/agents/:id/confirm",
  authenticationMiddlewareAgent,
  validateParams(AppointmentParamsSchema),
  agentConfirmAppointment,
);

router.patch(
  "/agents/:id/reject",
  authenticationMiddlewareAgent,
  validateParams(AppointmentParamsSchema),
  agentRejectAppointment,
);

router.patch(
  "/agents/:id/cancel",
  authenticationMiddlewareAccount,
  validateParams(AppointmentParamsSchema),
  accountCancelAppointment,
);

export default router;
