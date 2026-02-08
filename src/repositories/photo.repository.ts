import { AppDataSource } from "../../src/data-source.js";
import { Photo } from "../../src/entities/photo.js";
export const PhotoRepository = AppDataSource.getRepository(Photo);