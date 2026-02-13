import { Router } from "express";
import { uploadPhotos } from "../utils/multer.utils.js";
import { uploadAdvertisementPhotos } from "../controllers/upload.controller.js";
import { authenticationMiddlewareAgent } from "../middleware/auth.agent.middleware.js";

const router = Router();
router.post(
  "/photos",
  authenticationMiddlewareAgent,
  uploadPhotos,
  uploadAdvertisementPhotos,
);
export default router;
