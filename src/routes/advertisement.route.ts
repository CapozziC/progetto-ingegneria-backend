import express from "express";
const router = express.Router();
import { authenticationMiddlewareAgent } from "../middleware/auth.agent.middleware.js";
import { uploadPhotos } from "../utils/multer.utils.js";
import { parseJsonFields } from "../utils/objectParse.utils.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { createAdvertisementSchema } from "../validations/advertisement.validation.js";
import {
  createAdvertisementWithRealEstateAndPhotosTx,
  deleteAgentAdvertisement,
} from "../controllers/advertisment.controller.js";
import {
  getAvailableDays,
  getAvailableSlotsByDay,
  createAppointment
} from "../controllers/appointment.controller.js";
import { authenticationMiddlewareAccount } from "../middleware/auth.account.middleware.js";

router.post(
  "/create",
  authenticationMiddlewareAgent,
  uploadPhotos,
  parseJsonFields(["realEstate"]),
  validateBody(createAdvertisementSchema),
  createAdvertisementWithRealEstateAndPhotosTx,
);

router.delete(
  "/delete/:id",
  authenticationMiddlewareAgent,
  deleteAgentAdvertisement,
);

router.get(
  "/advertisements/:id/available-days",
  authenticationMiddlewareAccount,
  getAvailableDays,
);
router.get(
  "/advertisements/:id/available-slots",
  authenticationMiddlewareAccount,
  getAvailableSlotsByDay,
);
router.post(
  "/advertisements/:id/appointments",
  authenticationMiddlewareAccount,
  createAppointment,
);
export default router;
