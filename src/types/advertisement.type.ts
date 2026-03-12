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

/**
 * Type representing the body of a request to update an advertisement, which can include any combination of updatable fields from both the Advertisement and RealEstate entities. 
 * This type is defined as a Partial of the intersection of AdvertisementUpdatableFields and RealEstateUpdatableFields, allowing for flexibility in updating only the desired fields while ensuring type safety.
 */
type AdvertisementUpdatableFields = Pick<
  Advertisement,
  "description" | "price" | "type" | "status"
>;
/**
 *  Type representing the body of a request to update an advertisement, which can include any combination of updatable fields from both the Advertisement and RealEstate entities.
 *  This type is defined as a Partial of the intersection of AdvertisementUpdatableFields and RealEstateUpdatableFields, allowing for flexibility in updating only the desired fields while ensuring type safety.
 */
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

/**
 * Type representing the body of a request to update an advertisement, which can include any combination of updatable fields from both the Advertisement and RealEstate entities. This type is defined as a Partial of the intersection of AdvertisementUpdatableFields and RealEstateUpdatableFields, allowing for flexibility in updating only the desired fields while ensuring type safety.
 */
export type UpdateAdvertisementBody = Partial<
  AdvertisementUpdatableFields & RealEstateUpdatableFields
>;
/**
 * Type representing the parameters for updating an advertisement by an agent, including the unique identifier of the advertisement to update, the unique identifier of the agent performing the update, and the body of the update request containing the fields to be updated.
 * This type ensures that all necessary information is provided for processing the update request while maintaining type safety.
 */
export type UpdateAdvertisementByAgentParams = {
  advertisementId: number;
  agentId: number;
  value: UpdateAdvertisementBody;
};