import { AppDataSource } from "../data-source.js";
import { Logo } from "../../src/entities/logo.js";
export const LogoRepository = AppDataSource.getRepository(Logo);