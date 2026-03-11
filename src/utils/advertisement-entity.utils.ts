import { Advertisement } from "../entities/advertisement.js";
import { RealEstate } from "../entities/realEstate.js";
import { Agent } from "../entities/agent.js";

export const buildRealEstateEntity = (reDto: RealEstate): RealEstate => {
  return Object.assign(new RealEstate(), {
    size: reDto.size,
    rooms: reDto.rooms,
    floor: reDto.floor,
    bathrooms: reDto.bathrooms,
    elevator: reDto.elevator,
    airConditioning: reDto.airConditioning,
    heating: reDto.heating,
    concierge: reDto.concierge,
    parking: reDto.parking,
    garage: reDto.garage,
    furnished: reDto.furnished,
    solarPanels: reDto.solarPanels,
    balcony: reDto.balcony,
    terrace: reDto.terrace,
    garden: reDto.garden,
    energyClass: reDto.energyClass,
    housingType: reDto.housingType,
    addressInput: reDto.addressInput,
  });
};

export const buildAdvertisementEntity = ({
  body,
  agentId,
  realEstate,
}: {
  body: { description: string; price: number; type: string; status: string };
  agentId: number;
  realEstate: RealEstate;
}): Advertisement => {
  return Object.assign(new Advertisement(), {
    description: body.description,
    price: body.price,
    type: body.type,
    status: body.status,
    agent: { id: agentId } as Agent,
    realEstate,
  });
};
