import { Advertisement } from "../entities/advertisement.js";
import { Photo } from "../entities/photo.js";
import { RealEstate } from "../entities/realEstate.js";
import { findAdvertisements } from "../repositories/advertisement.repository.js";
import { LocationInfo, LocationMode } from "../types/advertisement.type.js";
import { buildAdvertisementTitle } from "../utils/advertisement-title.utils.js";

/**
 * Builds a response object for advertisements based on the provided result, location mode, and location information. The function takes the result of a findAdvertisements query, which includes an array of advertisement items, and maps each advertisement to include a title generated from its real estate details. The response object includes the location mode, location information, and the modified result with advertisement items that now contain titles. This function is intended to be used as a mapper to format the response for advertisement-related API endpoints.
 * @param result - The result of a findAdvertisements query, containing an array of advertisement items and other pagination information.
 * @param mode - The location mode indicating how the location was determined (e.g., "coords", "city", "ip").
 * @param locationInfo - An object containing detailed information about the location used for the advertisements query, such as latitude, longitude, formatted address, etc.
 * @returns An object that includes the location mode, location information, and the modified result with advertisement items that now include generated titles based on their real estate details.
 */
export const buildAdvertisementResponse = (
  result: Awaited<ReturnType<typeof findAdvertisements>>,
  mode: LocationMode,
  locationInfo: LocationInfo,
) => {
  return {
    mode,
    location: locationInfo,
    ...result,
    items: result.items.map((adv) => ({
      ...adv,
      title: buildAdvertisementTitle({
        rooms: adv.realEstate?.rooms,
        addressFormatted: adv.realEstate?.addressFormatted,
        housingType: adv.realEstate?.housingType,
      }),
    })),
  };
};

/**
 * Builds a response object for a created advertisement, including the advertisement details, associated real estate information, and photos. The function takes an object containing the created advertisement entity, the associated real estate entity, and an array of photo entities. It constructs a response object that includes the advertisement's ID, description, price, type, status, agent ID, and real estate ID, along with the full real estate details and an array of photos. This function is intended to be used as a mapper to format the response for the API endpoint that handles the creation of new advertisements.
 * @param param0 - An object containing the created advertisement entity, the associated real estate entity, and an array of photo entities.
 * @returns An object that includes the advertisement details (ID, description, price, type, status, agent ID, real estate ID), the full real estate information, and an array of photos associated with the advertisement.
 */
export const buildCreateAdvertisementResponse = ({
  advertisement,
  realEstate,
  photos,
}: {
  advertisement: Advertisement;
  realEstate: RealEstate;
  photos: Photo[];
}) => {
  return {
    advertisement: {
      id: advertisement.id,
      description: advertisement.description,
      price: advertisement.price,
      type: advertisement.type,
      status: advertisement.status,
      agentId: advertisement.agent.id,
      realEstateId: advertisement.realEstate.id,
    },
    realEstate,
    photos,
  };
};
/**
 * Builds a response object for an updated advertisement, including a success message and the updated advertisement details. The function takes an updated advertisement entity and constructs a response object that includes a message indicating the successful update and an item object containing the advertisement's ID, description, price, type, status, associated real estate information, photos sorted by their position, and points of interest (POIs). This function is intended to be used as a mapper to format the response for the API endpoint that handles updating advertisements.
 * @param advertisement - The updated advertisement entity containing the latest details after the update operation.
 * @returns An object that includes a success message and an item object with the updated advertisement details, including ID, description, price, type, status, associated real estate information, sorted photos, and points of interest (POIs).
 */
export const buildUpdatedAdvertisementResponse = (
  advertisement: Advertisement,
) => {
  return {
    message: "Advertisement updated successfully",
    item: {
      id: advertisement.id,
      description: advertisement.description,
      price: advertisement.price,
      type: advertisement.type,
      status: advertisement.status,
      realEstate: advertisement.realEstate,
      photos: (advertisement.photos ?? []).sort(
        (a, b) => a.position - b.position,
      ),
      pois: advertisement.pois ?? [],
    },
  };
};
