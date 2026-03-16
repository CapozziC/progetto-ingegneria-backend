import bcrypt from "bcryptjs";
import type { Account } from "../../src/entities/account.js";

export const makeAccount = async (
  overrides: Partial<Account> = {},
): Promise<Account> => {
  return {
    id: 10,
    username: "lucia",
    password: await bcrypt.hash("Password123", 10),
    firstName: "Lucia",
    lastName: "Verdi",
    email: "luciaverdi@example.com",
    phoneNumber: "+391234567890",
    createdAt: new Date("2026-03-16T08:00:00.000Z"),
    updatedAt: new Date("2026-03-16T08:00:00.000Z"),
    ...overrides,
  } as Account;
}