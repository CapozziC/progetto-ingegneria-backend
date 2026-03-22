import type { Advertisement } from "../../src/entities/advertisement.js";
import { Status } from "../../src/entities/advertisement.js";
import { makeAgent } from "./agent.mock.js";

export const makeAdvertisement = async (
  overrides: Partial<Advertisement> = {},
): Promise<Advertisement> => {
  const agent = overrides.agent ?? (await makeAgent());

  return {
    id: 1,
    status: Status.ACTIVE,
    type: "sale",
    price: 100000,
    description: "Beautiful house with sea view",
    createdAt: new Date("2026-03-16T08:00:00.000Z"),
    updatedAt: new Date("2026-03-16T08:00:00.000Z"),

    agent,
    agentId: agent.id,

    realEstate: {
      id: 1,
      addressFormatted: "123 Main St, City, Country",
      bathrooms: 2,
      size: 120,
      rooms: 3,
      floor: 2,
      elevator: true,
      airConditioning: false,
      heating: true,
      concierge: false,
      parking: true,
      garage: false,
      furnished: true,
      solarPanels: false,
      balcony: true,
      terrace: false,
      garden: false,
      energyClass: "A",
      housingType: "apartment",
      location: {
        type: "Point",
        coordinates: [12.4924, 41.8902],
      },
    },
    photos: [
      {
        id: 1,
        url: "https://example.com/photo1.jpg",
        advertisementId: 1,
      },
      {
        id: 2,
        url: "https://example.com/photo2.jpg",
        advertisementId: 1,
      },
    ],

    ...overrides,
  } as Advertisement;
};
