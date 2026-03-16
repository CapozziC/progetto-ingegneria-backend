import bcrypt from "bcryptjs";
import type { Agent } from "../../src/entities/agent.js";
import { Agency } from "../../src/entities/agency.js";

export const makeAgent = async (
  overrides: Partial<Agent> = {},
): Promise<Agent> => {
  return {
    id: 10,
    username: "mariorossi",
    password: await bcrypt.hash("Password123", 10),
    isPasswordChange: false,
    isAdmin: false,
    agency: {
      id: 1,
      name: "Dieti Estates",
      email: "dieti.estates@example.com",
      phoneNumber: "+391234567890",
    } as Agency,
    firstName: "Mario",
    lastName: "Rossi",
    phoneNumber: "+391234567890",
    createdAt: new Date("2026-03-16T08:00:00.000Z"),
    updatedAt: new Date("2026-03-16T08:00:00.000Z"),
    ...overrides,
  } as Agent;
};
