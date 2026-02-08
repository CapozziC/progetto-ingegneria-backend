import { AppDataSource } from "../../src/data-source.js";
import { Advertisement } from "../../src/entities/advertisement.js";
export const AdvertisementRepository =
  AppDataSource.getRepository(Advertisement);
