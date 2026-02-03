import { AppDataSource } from "../data-source.js";
import { RealEstate } from "../entities/realEstate.js";
export const RealEstateRepository = AppDataSource.getRepository(RealEstate);