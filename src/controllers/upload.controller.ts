import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
/**
 * Convert a file extension to a PhotoFormat enum value. The function takes a file extension as input, removes the leading dot, converts it to uppercase and returns the corresponding PhotoFormat enum value. If the extension does not match any of the known formats (JPG, JPEG, PNG, HEIC), it defaults to JPG.
 * @param ext The file extension to convert (e.g. ".jpg", ".png")
 * @returns The corresponding PhotoFormat enum value (e.g. PhotoFormat.JPG, PhotoFormat.PNG)
 */
const extToFormat = (ext: string) => {
  const e = ext.replace(".", "").toUpperCase();
  if (e === "JPG") return "JPG";
  if (e === "JPEG") return "JPEG";
  if (e === "PNG") return "PNG";
  if (e === "HEIC") return "HEIC";
  return "JPG";
};

/**
 * Upload photos for an advertisement. The uploaded files are processed to generate their URLs and formats, which are then returned in the response. The files are expected to be stored in a public directory accessible via a URL.
 * @param req The Express request object, which should contain the uploaded files in req.files
 * @param res The Express response object, used to send the response back to the client
 * @returns A JSON response containing an array of photo objects with their URLs and formats
 */
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

/**
 * Safely delete uploaded files in case of an error during processing. This function attempts to delete each file and ignores any errors that occur during deletion, ensuring that the main error handling flow is not disrupted.
 * @param files An array of uploaded files to be deleted
 */
export const deleteUploadedFilesSafe = async (files: Express.Multer.File[]) => {
  await Promise.allSettled(
    files.map((f) => (f.path ? fs.unlink(f.path) : Promise.resolve())),
  );
};

