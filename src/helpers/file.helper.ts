import { Format, Format as PhotoFormat } from "../entities/photo.js";

const normalizeExtension = (ext: string): string =>
  ext.replace(".", "").trim().toUpperCase();

const EXTENSION_TO_FORMAT: Record<string, Format> = {
  JPG: Format.JPG,
  JPEG: Format.JPEG,
  PNG: Format.PNG,
  HEIC: Format.HEIC,
};

export const extToPhotoFormatEnum = (ext: string): PhotoFormat => {
  const normalizedExt = normalizeExtension(ext);
  return EXTENSION_TO_FORMAT[normalizedExt] ?? PhotoFormat.JPG;
};

export const extToLogoFormat = (ext: string): Format => {
  const normalizedExt = normalizeExtension(ext);
  return EXTENSION_TO_FORMAT[normalizedExt] ?? Format.JPG;
};

export const extToFormat = (ext: string): string => {
  const normalizedExt = normalizeExtension(ext);
  return normalizedExt in EXTENSION_TO_FORMAT ? normalizedExt : "JPG";
};

export function getRelativePathFromUrl(
  fileUrl: string,
  baseUrl: string,
): string {
  if (fileUrl.startsWith(baseUrl)) {
    return fileUrl.replace(baseUrl, "");
  }

  return fileUrl;
}

export const extToFormatNoString = (ext: string): Format => {
  const normalizedExt = normalizeExtension(ext);
  return EXTENSION_TO_FORMAT[normalizedExt] ?? Format.JPG;
};
