import { AppDataSource } from "../data-source.js";
import { Offer } from "../entities/offer.js";

export const OfferRepository = AppDataSource.getRepository(Offer);
