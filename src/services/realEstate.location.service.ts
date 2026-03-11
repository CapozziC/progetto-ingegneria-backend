import { RealEstate } from "../entities/realEstate.js";
import { makePoint4326 } from "../utils/point.utils.js";
import { forwardGeocodeAddress } from "./geopify/geocode.service.js";

export const resolveRealEstateLocation = async (
  realEstate: RealEstate,
  reDto: {
    address?: string;
    addressInput?: string;
    location?: { lng: number; lat: number };
  },
): Promise<void> => {
  const addressText =
    typeof reDto.address === "string" && reDto.address.trim()
      ? reDto.address.trim()
      : typeof reDto.addressInput === "string" && reDto.addressInput.trim()
        ? reDto.addressInput.trim()
        : "";

  if (addressText) {
    const geo = await forwardGeocodeAddress(addressText);

    if (!geo) {
      throw new Error("ADDRESS_NOT_FOUND");
    }

    realEstate.addressFormatted = geo.formatted || addressText;
    realEstate.placeId = geo.placeId;
    realEstate.location = makePoint4326(geo.lng, geo.lat);
    return;
  }

  if (reDto.location?.lng != null && reDto.location?.lat != null) {
    realEstate.location = makePoint4326(reDto.location.lng, reDto.location.lat);
    return;
  }

  throw new Error("LOCATION_REQUIRED");
};
