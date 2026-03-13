import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

/**
 * Multer configuration for handling file uploads, specifically for photos and logos.
 * The uploaded files are stored in designated directories with unique names to prevent conflicts.
 * Only JPEG, PNG, and HEIC image formats are allowed, with specific size limits for photos and logos.
 */
const uploadDir = process.env.UPLOAD_DIR;

if (!uploadDir) {
  throw new Error("UPLOAD_DIR environment variable is not defined");
}

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const tmpPhotosDir = path.join(uploadDir, "tmp", "photos");
const logosDir = path.join(uploadDir, "logos");

ensureDir(tmpPhotosDir);
ensureDir(logosDir);

/**
 * Multer file filter to allow only JPEG, PNG, and HEIC image formats.
 * Rejects any files that do not match the allowed MIME types.
 */
const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/heic"];
  if (!allowed.includes(file.mimetype))
    return cb(new Error("Unsupported file type"));
  cb(null, true);
};

/**
 * Multer middleware for handling photo uploads.
 * Accepts multiple files with the field name "photos".
 * The files are stored in the "tmp/photos" directory with unique names.
 * Only JPEG, PNG, and HEIC formats are allowed, and the maximum file size is 8MB per file.
 */
const photosStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tmpPhotosDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString("hex");
    cb(null, `${name}${ext}`);
  },
});
/**
 * Multer middleware for handling photo uploads.
 * Accepts multiple files with the field name "photos".
 * The files are stored in the "tmp/photos" directory with unique names.
 * Only JPEG, PNG, and HEIC formats are allowed, and the maximum file size is 8MB per file.
 */
export const uploadPhotos = multer({
  storage: photosStorage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
}).array("photos", 10);

/**
 * Multer middleware for handling logo uploads.
 * Accepts a single file with the field name "logo".
 * The file is stored in the "logos" directory with a unique name.
 * Only JPEG, PNG, and HEIC formats are allowed, and the maximum file size is 2MB.
 */
const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logosDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString("hex");
    cb(null, `${name}${ext}`);
  },
});
/**
 * Multer middleware for handling logo uploads. Accepts a single file with the field name "logo".
 * The file is stored in the "logos" directory with a unique name. Only JPEG, PNG, and HEIC formats are allowed, and the maximum file size is 2MB.
 */
export const uploadLogo = multer({
  storage: logoStorage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single("logo");

/** * Multer middleware for handling single photo uploads. Accepts a single file with the field name "photo".
 * The file is stored in the "tmp/photos" directory with a unique name. Only JPEG, PNG, and HEIC formats are allowed, and the maximum file size is 8MB.
 */
export const uploadSinglePhoto = multer({
  storage: photosStorage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
}).single("photo");
