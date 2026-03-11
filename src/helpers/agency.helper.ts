import { Repository } from "typeorm";
import { Request } from "express";
import { Agency } from "../entities/agency.js";
import { Logo } from "../entities/logo.js";
import path from "path";
import { extToLogoFormat } from "../utils/multer.utils.js";

/**
 * Checks if an agency with the given name or email already exists in the database.
 * If an agency with the same name is found, it throws an error with the message "AGENCY_NAME_ALREADY_EXISTS".
 * If an agency with the same email is found, it throws an error with the message "AGENCY_EMAIL_ALREADY_EXISTS".
 * If no existing agency is found with the given name or email, the function completes without returning anything.
 * @param agencyRepo - TypeORM repository for the Agency entity, used to query the database for existing agencies
 * @param name - The name of the agency to check for existence
 * @param email - The email of the agency to check for existence
 * @throws Error if an agency with the same name or email already exists in the database
 */
export const ensureAgencyDoesNotExist = async (
  agencyRepo: Repository<Agency>,
  name: string,
  email: string,
): Promise<void> => {
  const existingAgencyByName = await agencyRepo.findOne({
    where: { name },
  });

  if (existingAgencyByName) {
    throw new Error("AGENCY_NAME_ALREADY_EXISTS");
  }

  const existingAgencyByEmail = await agencyRepo.findOne({
    where: { email },
  });

  if (existingAgencyByEmail) {
    throw new Error("AGENCY_EMAIL_ALREADY_EXISTS");
  }
};

/**
 * Creates a new logo entity for the given agency using the provided file and base URL.
 * The logo URL is constructed based on the base URL and the file name, and the format is determined from the file extension.
 * @param logoRepo - TypeORM repository for the Logo entity, used to save the new logo in the database
 * @param file - The uploaded file containing the logo image, expected to have properties like originalname and filename
 * @param agency - The Agency entity to which the logo will be associated
 * @param baseUrl - The base URL of the server, used to construct the full URL for accessing the logo
 * @returns A promise that resolves to the created Logo entity after it has been saved in the database
 */
export const createAgencyLogo = async ({
  logoRepo,
  file,
  agency,
  baseUrl,
}: {
  logoRepo: Repository<Logo>;
  file: Express.Multer.File;
  agency: Agency;
  baseUrl: string;
}): Promise<Logo> => {
  const url = `${baseUrl}/uploads/logos/${file.filename}`;
  const format = extToLogoFormat(path.extname(file.originalname));

  const logo = logoRepo.create({
    url,
    format,
    agency,
  });

  return logoRepo.save(logo);
};

/** 
 * Validates the request body for creating a new agency with its first agent. It checks for the presence of required fields and returns an error message if any are missing or if the request body is not properly formatted. The function expects the request body to contain the agency's name, email, phone number, as well as the first agent's first name, last name, and phone number. If all validations pass, it returns null, indicating that the request is valid.
 * If the request body is missing, it returns an error message indicating that the body is required and should be in multipart/form-data format. If any of the required fields for the agency or the first agent are missing, it returns an error message specifying which fields are required. This function is intended to be used as a validation step before processing the creation of a new agency and its first agent in the database.
 * @param req - The Express request object containing the body of the request to validate
 * @returns A string containing an error message if validation fails, or null if validation is successful
 */
export const validateCreateAgencyRequest = (req: Request): string | null => {
  if (!req.body) {
    return "Request body is required. Use multipart/form-data (Body -> form-data in Postman).";
  }

  const {
    name,
    email,
    agencyPhoneNumber,
    firstName,
    lastName,
    agentPhoneNumber,
  } = req.body;

  if (!name || !email || !agencyPhoneNumber) {
    return "Name, email and agency phone number are required";
  }

  if (!firstName || !lastName || !agentPhoneNumber) {
    return "First name, last name and agent phone number are required";
  }

  return null;
};