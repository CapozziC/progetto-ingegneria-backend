import { AppDataSource } from "../data-source.js";
import { Agency } from "../entities/agency.js";
export const AgencyRepository = AppDataSource.getRepository(Agency);

/** Find an agency by its name. This function queries the database for an agency with the specified name and returns it if found. If no agency is found with the given name, it returns null.
 * @param name The name of the agency to find
 * @returns A Promise that resolves to the Agency object if found, or null if not found
 */
export const findAgencyByName = async (
  name: string,
): Promise<Agency | null> => {
  return AgencyRepository.findOne({ where: { name } });
};

/**
 *  Find an agency by its email address. This function queries the database for an agency with the specified email and returns it if found. If no agency is found with the given email, it returns null.
 * @param email The email address of the agency to find
 * @returns A Promise that resolves to the Agency object if found, or null if not found
 */
export const findAgencyByEmail = async (
  email: string,
): Promise<Agency | null> => {
  return AgencyRepository.findOne({ where: { email } });
};

/**
 *  Create a new agency instance with the provided data. This function takes a partial agency object containing the necessary fields for agency creation and returns a new Agency instance that can be saved to the database.
 * @param data A partial object containing the necessary fields for creating a new agency
 * @returns A new Agency instance created from the provided data
 */
export const createAgency = (data: Partial<Agency>): Agency => {
  return AgencyRepository.create(data);
};

/** Save an agency to the database. This function takes an Agency object and saves it to the database using the AgencyRepository. It returns a Promise that resolves to the saved Agency object, which may include additional fields such as the generated ID.
 * @param agency The Agency object to save to the database
 * @returns A Promise that resolves to the saved Agency object
 */
export const saveAgency = async (agency: Agency): Promise<Agency> => {
  return AgencyRepository.save(agency);
};
