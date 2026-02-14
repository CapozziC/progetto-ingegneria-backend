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
export default router;
