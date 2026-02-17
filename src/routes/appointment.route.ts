import express from "express";
const router = express.Router();

import { authenticationMiddlewareAgent } from "../middleware/auth.agent.middleware.js";
import {
  agentConfirmAppointment,
  agentRejectAppointment,
  accountCancelAppointment,
} from "../controllers/appointment.controller.js";
import { authenticationMiddlewareAccount } from "../middleware/auth.account.middleware.js";

router.patch(
  "/:id/confirm",
  authenticationMiddlewareAgent,
  agentConfirmAppointment,
);

router.patch(
  "/:id/reject",
  authenticationMiddlewareAgent,
  agentRejectAppointment,
);

router.patch(
  "/:id/cancel",
  authenticationMiddlewareAccount,
  accountCancelAppointment,
);

export default router;
