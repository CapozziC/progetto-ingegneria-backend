/**
 * This file defines the TypeScript type for Google account data used in the authentication process.
 */
export type GoogleAccountData = {
  providerAccountId: string;
  email?: string;
  firstName: string;
  lastName: string;
};
