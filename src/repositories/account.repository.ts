import { AppDataSource } from "../data-source.js";
import { Account } from "../entities/account.js";
export const AccountRepository = AppDataSource.getRepository(Account);

/**
 * Find an account by its email address. This function queries the database for an account with the specified email and returns it if found. If no account is found with the given email, it returns null.
 * @param email The email address of the account to find
 * @returns A Promise that resolves to the Account object if found, or null if not found
 */
export const findAccountByEmail = async (email: string) => {
  return await AccountRepository.findOne({ where: { email } });
};

/**
 * Create a new account instance with the provided user data. This function takes a partial account object containing the necessary fields for account creation and returns a new Account instance that can be saved to the database.
 * @param userData An object containing the fields required to create a new account (e.g. firstName, lastName, email, password)
 * @returns A new Account instance created with the provided user data
 */
export const createAccount = (userData: Partial<Account>): Account => {
  return AccountRepository.create(userData);
};

/** Save an account to the database. This function takes an Account object and saves it to the database using the AccountRepository. It returns a Promise that resolves to the saved Account object, which may include additional fields such as the generated ID.
 * @param account The Account object to save to the database
 * @returns A Promise that resolves to the saved Account object
 */
export const saveAccount = async (account: Account): Promise<Account> => {
  return await AccountRepository.save(account);
};

/**
 *  Find an account by its unique identifier (ID). This function queries the database for an account with the specified ID and returns it if found. If no account is found with the given ID, it returns null.
 * @param id The unique identifier of the account to find
 * @returns A Promise that resolves to the Account object if found, or null if not found
 */

export const findAccountById = async (id: number): Promise<Account | null> => {
  return await AccountRepository.findOne({ where: { id } });
};
