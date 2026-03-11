import { Advertisement } from "../entities/advertisement.js";
import { RealEstate } from "../entities/realEstate.js";
import { Agent } from "../entities/agent.js";

/**
 * Builds a RealEstate entity from a given RealEstate DTO (Data Transfer Object). The function takes a RealEstate DTO as input and creates a new RealEstate entity by copying the relevant properties from the DTO to the new entity instance. The properties copied include size, rooms, floor, bathrooms, elevator, air conditioning, heating, concierge, parking, garage, furnished status, solar panels, balcony, terrace, garden, energy class, housing type, and address input. The resulting RealEstate entity is returned after being populated with the data from the DTO.
 * @param reDto - The RealEstate DTO containing the data to be transferred to the RealEstate entity. This DTO is expected to have properties that correspond to the fields of the RealEstate entity.
 * @returns A new instance of the RealEstate entity populated with the data from the provided RealEstate DTO.
 */
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

/**
 *  Builds an Advertisement entity from the given request body, agent ID, and associated RealEstate entity. The function takes the description, price, type, and status from the request body and assigns them to a new Advertisement entity. It also associates the advertisement with the agent by setting the agent property to an object containing the agent's ID. Additionally, it links the advertisement to the provided RealEstate entity. The resulting Advertisement entity is returned after being populated with all the relevant data.
 * @param param0 - An object containing the body of the request, the agent ID, and the associated RealEstate entity. The body is expected to have properties such as description, price, type, and status, which are used to populate the corresponding fields in the Advertisement entity. The agentId is used to associate the advertisement with a specific agent, and the realEstate parameter links the advertisement to a particular real estate listing.
 * @returns   A new instance of the Advertisement entity populated with the data from the request body, associated with the specified agent and real estate listing.
 */
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
