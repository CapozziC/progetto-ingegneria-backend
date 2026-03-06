import express from "express";
const router = express.Router();
import { authenticationMiddlewareAccount } from "../middleware/auth.account.middleware.js";
import { getAppointmentsForAccount } from "../controllers/appointment.controller.js";
import {
  deleteAccount,
  getAccountNegotiationByAdvertisementAndAgent,
  getAccountNegotiations,
  getAdvertisementById,
  getAllAdvertisements,
} from "../controllers/account.controller.js";

router.get(
  "/me/appointments",
  authenticationMiddlewareAccount,
  getAppointmentsForAccount,
);
//GET /api/advertisements(ip)
//GET /api/advertisements?city=Milano
//GET /api/advertisements?lat=..&lon=..
//GET /api/advertisements?status=..&type=..&city=..&lat=..&lon=..&take=..&skip=..
//ROUTE FOR GETTING ADVERTISEMENT
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

router.delete("/delete/:id", authenticationMiddlewareAccount, deleteAccount);

export default router;
