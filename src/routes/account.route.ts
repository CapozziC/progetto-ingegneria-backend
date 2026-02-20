import express from "express";
const router = express.Router();
import { authenticationMiddlewareAccount } from "../middleware/auth.account.middleware.js";
import { getAppointmentsForAccount } from "../controllers/appointment.controller.js";

router.get(
  "/my_appointments",
  authenticationMiddlewareAccount,
  getAppointmentsForAccount,
);

export default router;
