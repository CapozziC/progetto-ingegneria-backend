import { UpdateAdvertisementBody } from "../types/advertisement.type.js";
import { Advertisement } from "../entities/advertisement.js";
import { RealEstate } from "../entities/realEstate.js";

/**
 * Defines the fields that can be updated for an Advertisement entity and a RealEstate entity. The `advertisementFields` array lists the fields of the Advertisement that can be updated, while the `realEstateFields` array lists the fields of the RealEstate that can be updated. These arrays are used to build partial update data objects for both entities based on the provided update values.
 * The `buildAdvertisementUpdateData` function takes an object containing the update values and constructs a partial object for the Advertisement entity, including only the fields that are defined in the `advertisementFields` array. Similarly, the `buildRealEstateUpdateData` function constructs a partial object for the RealEstate entity based on the `realEstateFields` array. These functions are useful for handling update operations where only a subset of fields may be provided for updating an advertisement and its associated real estate information.
 * @see updateAdvertisementByAgent in src/services/advertisement.service.ts for an example of how these functions are used to perform an update operation on an advertisement and its associated real estate entity.
 * @see UpdateAdvertisementBody in src/types/advertisement.type.ts for the type definition of the update values that can be passed to these functions.
 * @see Advertisement and RealEstate entities for the full list of fields available in each entity.
 * @param value - An object containing the update values for the advertisement and real estate fields. The object may include any subset of the fields defined in the `advertisementFields` and `realEstateFields` arrays.
 * @returns An object containing the partial update data for the Advertisement and RealEstate entities, which can be used in an update operation to modify only the specified fields of an advertisement and its associated real estate information.
 */
export const advertisementFields = [
  "description",
  "price",
  "type",
  "status",
] as const;

export const realEstateFields = [
  "size",
  "rooms",
  "bathrooms",
  "floor",
  "elevator",
  "airConditioning",
  "heating",
  "concierge",
  "parking",
  "garage",
  "furnished",
  "solarPanels",
  "balcony",
  "terrace",
  "garden",
  "energyClass",
  "housingType",
] as const;

export const buildAdvertisementUpdateData = (
  value: UpdateAdvertisementBody,
): Partial<Pick<Advertisement, (typeof advertisementFields)[number]>> => {
  return Object.fromEntries(
    advertisementFields
      .filter((field) => value[field] !== undefined)
      .map((field) => [field, value[field]]),
  ) as Partial<Pick<Advertisement, (typeof advertisementFields)[number]>>;
};

export const buildRealEstateUpdateData = (
  value: UpdateAdvertisementBody,
): Partial<Pick<RealEstate, (typeof realEstateFields)[number]>> => {
  return Object.fromEntries(
    realEstateFields
      .filter((field) => value[field] !== undefined)
      .map((field) => [field, value[field]]),
  ) as Partial<Pick<RealEstate, (typeof realEstateFields)[number]>>;
};

