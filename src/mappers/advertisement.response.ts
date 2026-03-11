import { Advertisement } from "../entities/advertisement.js";
import { Photo } from "../entities/photo.js";
import { RealEstate } from "../entities/realEstate.js";
import { findAdvertisements } from "../repositories/advertisement.repository.js";
import { LocationInfo, LocationMode } from "../types/advertisement.type.js";
import { buildAdvertisementTitle } from "../utils/advertisement-title.utils.js";

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
