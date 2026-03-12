import express from "express";
const router = express.Router();
import { authenticationMiddlewareAccount } from "../middleware/auth.account.middleware.js";
import { getAppointmentsForAccount } from "../controllers/appointment.controller.js";
import {
  deleteAccount,
  getAccountNegotiationByAdvertisementAndAgent,
  getAccountNegotiations,
  getAccountProfile,
  getAdvertisementById,
  getAllAdvertisements,
  updatePasswordAccount,
} from "../controllers/account.controller.js";
import { validateParams, validateBody } from "../middleware/validate.middleware.js";
import {
  deleteAccountSchema,
  updatePasswordBodySchema,
  updatePasswordParamsSchema,
} from "../validations/account.validation.js";

router.get("/me/info", authenticationMiddlewareAccount, getAccountProfile);

router.get(
  "/me/appointments",
  authenticationMiddlewareAccount,
  getAppointmentsForAccount,
);
//GET /api/advertisements(ip)
//GET /api/advertisements?city=Milano
//GET /api/advertisements?lat=..&lon=..
//GET /api/advertisements?status=..&type=..&city=..&lat=..&lon=..&take=..&skip=..
//ROUTE FOR GETTING ADVERTISEMENTS
router.get(
  "/advertisements",
  authenticationMiddlewareAccount,
  getAllAdvertisements,
);

router.get(
  "/advertisements/:advertisementId",
  authenticationMiddlewareAccount,
  getAdvertisementById,
);
//ROUTE FOR OFFER NEGOTIATIONS
router.get(
  "/negotiations",
  authenticationMiddlewareAccount,
  getAccountNegotiations,
);
router.get(
  "/negotiations/:advertisementId/:agentId",
  authenticationMiddlewareAccount,
  getAccountNegotiationByAdvertisementAndAgent,
);

router.patch(
  "/:accountId/password",
  authenticationMiddlewareAccount,
  validateParams(updatePasswordParamsSchema),
  validateBody(updatePasswordBodySchema),
  updatePasswordAccount,
);  
router.delete(
  "/delete/:accountId",
  authenticationMiddlewareAccount,
  validateParams(deleteAccountSchema),
  deleteAccount,
);

export default router;
