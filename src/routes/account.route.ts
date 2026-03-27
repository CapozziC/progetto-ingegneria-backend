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
import {
  validateParams,
  validateBody,
} from "../middleware/validate.middleware.js";
import {
  deleteAccountSchema,
  updatePasswordBodySchema,
  updatePasswordParamsSchema,
} from "../validations/account.validation.js";

router.get("/me/info", authenticationMiddlewareAccount, getAccountProfile);

router.get(
  "/appointments",
  authenticationMiddlewareAccount,
  getAppointmentsForAccount,
);
//GET /api/advertisements(ip)
//GET /api/advertisements?city=Milano
//GET /api/advertisements?lat=..&lon=..
//GET /api/advertisements?status=..&type=..&city=..&lat=..&lon=..&take=..&skip=..
//GET /advertisement/all
//GET /advertisement/all?sortBy=nearest
//GET /advertisement/all?sortBy=farthest
//GET /advertisement/all?sortBy=price_asc
//GET /advertisement/all?sortBy=price_desc
//GET /advertisement/all?sortBy=newest
//GET /advertisement/all?sortBy=oldest
//GET /advertisement/all?city=Napoli&sortBy=nearest
//GET /advertisement/all?lat=40.8518&lon=14.2681&sortBy=price_desc
//ROUTE FOR GETTING ADVERTISEMENTS
router.get(
  "/advertisements",
  authenticationMiddlewareAccount,
  getAllAdvertisements,
);

router.get(
  "/advertisement/:advertisementId",
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
