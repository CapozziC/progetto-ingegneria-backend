import { AppDataSource } from "../data-source.js";
import { Agency } from "../entities/agency.js";
export const AgencyRepository = AppDataSource.getRepository(Agency);

export const findAgencyByName = async (
  name: string,
): Promise<Agency | null> => {
  return await AgencyRepository.findOne({ where: { name } });
};

export const findAgencyByEmail = async (
  email: string,
): Promise<Agency | null> => {
  return await AgencyRepository.findOne({ where: { email } });
};

export const createAgency = (data: Partial<Agency>): Agency => {
  return AgencyRepository.create(data);
};

export const saveAgency = async (agency: Agency): Promise<Agency> => {
  return await AgencyRepository.save(agency);
};


