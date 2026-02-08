import { AppDataSource } from "../../src/data-source.js";
import { Account } from "../../src/entities/account.js";
export const AccountRepository = AppDataSource.getRepository(Account);

export const findAccountByEmail = async (email: string) => {
  return await AccountRepository.findOne({ where: { email } });
};

export const createAccount = (userData: Partial<Account>): Account => {
  return AccountRepository.create(userData);
};

export const saveAccount = async (account: Account): Promise<Account> => {
  return await AccountRepository.save(account);
};

export const findAccountById = async (id: number): Promise<Account | null> => {
  return await AccountRepository.findOne({ where: { id } });
};
