import { AppDataSource } from "../data-source.js";
import { Photo } from "../entities/photo.js";
export const PhotoRepository = AppDataSource.getRepository(Photo);