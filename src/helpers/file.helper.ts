import { Format, Format as PhotoFormat } from "../entities/photo.js";
/**
 *  Convert file extension to PhotoFormat enum
 * @param ext file extension (e.g. ".jpg", ".png")
 * @returns corresponding PhotoFormat enum value (e.g. PhotoFormat.JPG, PhotoFormat.PNG)
 */
export const extToPhotoFormatEnum = (ext: string): PhotoFormat => {
  const e = ext.replace(".", "").toUpperCase();
  if (e === "JPG") return PhotoFormat.JPG;
  if (e === "JPEG") return PhotoFormat.JPEG;
  if (e === "PNG") return PhotoFormat.PNG;
  if (e === "HEIC") return PhotoFormat.HEIC;
  return PhotoFormat.JPG;
};

/**
 * Convert a file extension to the corresponding Format enum value for the agency logo.
 * This function takes a file extension as input, normalizes it by removing the leading dot and converting it to uppercase,
 * and then maps it to the appropriate Format enum value. If the extension does not match any known formats, it defaults to Format.JPG.
 * @param ext The file extension of the uploaded logo file (e.g., ".jpg", ".png")
 * @returns The corresponding Format enum value for the agency logo
 */
export const extToLogoFormat = (ext: string): Format => {
  const e = ext.replace(".", "").toUpperCase();
  if (e === "JPG") return Format.JPG;
  if (e === "JPEG") return Format.JPEG;
  if (e === "PNG") return Format.PNG;
  if (e === "HEIC") return Format.HEIC;
  return Format.JPG;
};

/**
 * Convert a file extension to a PhotoFormat enum value.
 * The function takes a file extension as input, removes the leading dot, converts it to uppercase and returns the corresponding PhotoFormat enum value.
 * If the extension does not match any of the known formats (JPG, JPEG, PNG, HEIC), it defaults to JPG.
 * @param ext The file extension to convert (e.g. ".jpg", ".png")
 * @returns The corresponding PhotoFormat enum value (e.g. PhotoFormat.JPG, PhotoFormat.PNG)
 */
export const extToFormat = (ext: string) => {
  const e = ext.replace(".", "").toUpperCase();
  if (e === "JPG") return "JPG";
  if (e === "JPEG") return "JPEG";
  if (e === "PNG") return "PNG";
  if (e === "HEIC") return "HEIC";
  return "JPG";
};
/**
 * Get the relative file path from a full URL by removing the base URL.
 * This function checks if the provided file URL starts with the specified base URL, and if so, it removes the base URL from the file URL to return the relative path. If the file URL does not start with the base URL, it returns the original file URL unchanged.
 * @param fileUrl The full URL of the file (e.g., "http://example.com/uploads/photos/photo.jpg")
 * @param baseUrl The base URL to remove from the file URL (e.g., "http://example.com")
 * @returns The relative file path (e.g., "/uploads/photos/photo.jpg") or the original file URL if it does not start with the base URL
 */
export function getRelativePathFromUrl(fileUrl: string, baseUrl: string) {
  if (fileUrl.startsWith(baseUrl)) {
    return fileUrl.replace(baseUrl, "");
  }
  return fileUrl;
}
/**
 * Convert a file extension to the corresponding Format enum value for photos, without returning a string. This function takes a file extension as input, normalizes it by removing the leading dot and converting it to uppercase, and then maps it to the appropriate Format enum value. If the extension does not match any known formats, it defaults to Format.JPG.
 * @param ext The file extension of the uploaded photo file (e.g., ".jpg", ".png")
 * @returns The corresponding Format enum value for the photo
 */
export const extToFormatNoString = (ext: string): Format => {
  const e = ext.replace(".", "").toUpperCase();

  if (e === "JPG") return Format.JPG;
  if (e === "JPEG") return Format.JPEG;
  if (e === "PNG") return Format.PNG;
  if (e === "HEIC") return Format.HEIC;

  return Format.JPG;
};