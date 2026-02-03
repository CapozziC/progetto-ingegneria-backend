import { AppDataSource } from "../data-source.js";
import { Poi } from "../entities/poi.js";

export const PoiRepository = AppDataSource.getRepository(Poi);
