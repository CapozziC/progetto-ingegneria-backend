import { AppDataSource } from "../../src/data-source.js";
import { RealEstate } from "../../src/entities/realEstate.js";
export const RealEstateRepository = AppDataSource.getRepository(RealEstate);