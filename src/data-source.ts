import "reflect-metadata";
import { DataSource } from "typeorm";
import "dotenv/config";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  entities: ["dist/entities/**/*.{ts,js}"],
  migrations: ["dist/migrations/**/*.{ts,js}"],

  synchronize: false,
  logging: false,
});
