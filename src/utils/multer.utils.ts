import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

const uploadDir = process.env.UPLOAD_DIR || "/Users/carla/Desktop/uploads";

// crea sottocartelle se non esistono
const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const photosDir = path.join(uploadDir, "photos");
const logosDir = path.join(uploadDir, "logos");

ensureDir(photosDir);
ensureDir(logosDir);

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/heic"];
  if (!allowed.includes(file.mimetype)) return cb(new Error("Unsupported file type"));
  cb(null, true);
};

// uploader per PHOTOS (come già hai, ma ora salva in /photos)
const photosStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, photosDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString("hex");
    cb(null, `${name}${ext}`);
  },
});

export const uploadPhotos = multer({
  storage: photosStorage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
}).array("photos", 20);

//uploader per LOGO (single file, field name = logo, salva in /logos)
const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logosDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString("hex");
    cb(null, `${name}${ext}`);
  },
});

export const uploadLogo = multer({
  storage: logoStorage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // logo più piccolo
}).single("logo"); // field name = logo
