import { RealEstate } from "../entities/realEstate.js";
import { Advertisement } from "../entities/advertisement.js";
export type LocationMode = "coords" | "city" | "ip" | "none";

export type LocationInfo =
  | { lat: number; lon: number }
  | {
      query: string;
      formatted: string;
      placeId: string;
      lat: number;
      lon: number;
    }
  | { ip: string; city?: string; country?: string; lat: number; lon: number }
  | null;

export type AdvertisementFilters = {
  take: number;
  skip: number;
  status?: string;
  type?: string;
  housingType?: string;
  city?: string;
  qLat?: number;
  qLon?: number;
  radiusMeters: number;
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  maxSize?: number;
  rooms?: number;
  floor?: number;
  bathrooms?: number;
  elevator?: boolean;
  airConditioning?: boolean;
  heating?: boolean;
  concierge?: boolean;
  parking?: boolean;
  garage?: boolean;
  furnished?: boolean;
  solarPanels?: boolean;
  balcony?: boolean;
  terrace?: boolean;
  garden?: boolean;
};

export type BuildAdvertisementTitleParams = {
  rooms?: number | null;
  street?: string | null;
  city?: string | null;
  housingType?: string | null;
  addressFormatted?: string | null;
};

type AdvertisementUpdatableFields = Pick<
  Advertisement,
  "description" | "price" | "type" | "status"
>;

type RealEstateUpdatableFields = Pick<
  RealEstate,
  | "size"
  | "rooms"
  | "bathrooms"
  | "floor"
  | "elevator"
  | "airConditioning"
  | "heating"
  | "concierge"
  | "parking"
  | "garage"
  | "furnished"
  | "solarPanels"
  | "balcony"
  | "terrace"
  | "garden"
  | "energyClass"
  | "housingType"
>;

export type UpdateAdvertisementBody = Partial<
  AdvertisementUpdatableFields & RealEstateUpdatableFields
>;

export type UpdateAdvertisementByAgentParams = {
  advertisementId: number;
  agentId: number;
  value: UpdateAdvertisementBody;
};