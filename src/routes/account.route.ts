import express from "express";
const router = express.Router();
import { authenticationMiddlewareAccount } from "../middleware/auth.account.middleware.js";
import { getAppointmentsForAccount } from "../controllers/appointment.controller.js";

router.get(
  "/me/appointments",
  authenticationMiddlewareAccount,
  getAppointmentsForAccount,
);

export default router;
