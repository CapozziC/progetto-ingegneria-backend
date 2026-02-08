import { AppDataSource } from "../data-source.js";
import { Poi } from "../../src/entities/poi.js";

export const PoiRepository = AppDataSource.getRepository(Poi);
