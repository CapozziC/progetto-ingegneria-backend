import { Account } from "../entities/account.js";

export const mapAccountToResponse = (account: Account) => {
  return {
    id: account.id,
    firstName: account.firstName,
    lastName: account.lastName,
    email: account.email,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    password: !!account.password,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
};
