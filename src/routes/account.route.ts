import express from "express";
const router = express.Router();
import { authenticationMiddlewareAccount } from "../middleware/auth.account.middleware.js";
import { getAppointmentsForAccount } from "../controllers/appointment.controller.js";
import { deleteAccount } from "../controllers/account.controller.js";


router.get(
  "/me/appointments", 
  authenticationMiddlewareAccount,
  getAppointmentsForAccount,
);
//GET /api/advertisements(ip)
//GET /api/advertisements?city=Milano
//GET /api/advertisements?lat=..&lon=.. 
//GET /api/advertisements?status=..&type=..&city=..&lat=..&lon=..&take=..&skip=..


export default router;

router.delete("/delete/:id", authenticationMiddlewareAccount, deleteAccount);
