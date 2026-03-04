import express from "express";
const router = express.Router();
import { authenticationMiddlewareAccount } from "../middleware/auth.account.middleware.js";
import { getAppointmentsForAccount } from "../controllers/appointment.controller.js";
import {
  deleteAccount,
  getAllAdvertisements,
} from "../controllers/account.controller.js";

router.get(
  "/me/appointments",
  authenticationMiddlewareAccount,
  getAppointmentsForAccount,
);

router.get(
  "/advertisements",
  authenticationMiddlewareAccount,
  getAllAdvertisements,
);
export default router;

router.delete("/delete/:id", authenticationMiddlewareAccount, deleteAccount);
