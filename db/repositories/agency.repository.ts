import { AppDataSource } from "../data-source.js";
import { Agency } from "../entities/agency.js";
export const AgencyRepository = AppDataSource.getRepository(Agency);
