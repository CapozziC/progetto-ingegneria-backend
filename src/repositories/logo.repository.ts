import { AppDataSource } from "../data-source.js";
import { Logo } from "../entities/logo.js";
export const LogoRepository = AppDataSource.getRepository(Logo);