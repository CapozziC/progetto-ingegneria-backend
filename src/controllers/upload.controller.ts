import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";

const extToFormat = (ext: string) => {
  const e = ext.replace(".", "").toUpperCase();
  if (e === "JPG") return "JPG";
  if (e === "JPEG") return "JPEG";
  if (e === "PNG") return "PNG";
  if (e === "HEIC") return "HEIC";
  return "JPG";
};

export const uploadAdvertisementPhotos = (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[]) ?? [];
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  const payload = files.map((f, idx) => {
    const url = `${baseUrl}/uploads/${f.filename}`;
    const format = extToFormat(path.extname(f.originalname));
    return { url, format, position: idx };
  });

  return res.status(201).json({ photos: payload });
};

export const deleteUploadedFilesSafe = async (files: Express.Multer.File[]) => {
  await Promise.allSettled(
    files.map((f) => (f.path ? fs.unlink(f.path) : Promise.resolve())),
  );
};
