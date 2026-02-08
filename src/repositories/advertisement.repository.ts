import { AppDataSource } from "../data-source.js";
import { Advertisement } from "../entities/advertisement.js";
export const AdvertisementRepository =
  AppDataSource.getRepository(Advertisement);
