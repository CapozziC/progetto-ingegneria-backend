import { AppDataSource } from "../../src/data-source.js";
import { Agency } from "../../src/entities/agency.js";
export const AgencyRepository = AppDataSource.getRepository(Agency);
