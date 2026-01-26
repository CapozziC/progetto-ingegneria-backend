import { AppDataSource } from "./db/data-source.js";

try {
  await AppDataSource.initialize();
} catch (error) {
  console.log(error);
}