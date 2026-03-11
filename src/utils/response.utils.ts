import { findAdvertisements } from "../repositories/advertisement.repository.js";
import { LocationInfo, LocationMode } from "../types/advertisement.type.js";
import { buildAdvertisementTitle } from "./advertisementTitle.utils.js";

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
