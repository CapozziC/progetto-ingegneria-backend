import multer from "multer";
import path from "path";
import crypto from "crypto";

const uploadDir = process.env.UPLOAD_DIR || "/Users/carla/Desktop/uploads";
if (!uploadDir) throw new Error("UPLOAD_DIR is not set");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString("hex");
    cb(null, `${name}${ext}`);
  },
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowed = ["image/jpeg", "image/png", "image/heic"];

  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Unsupported file type"));
  }

  cb(null, true);
};

export const uploadPhotos = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
}).array("photos", 20); // field name = photos
