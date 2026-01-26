import "reflect-metadata";
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  entities: ["db/entities/*.ts"],
  migrations: ["db/migrations/*.ts"],

  synchronize: false,
  logging: false,
});

try {
  await AppDataSource.initialize();
} catch (error) {
  console.log(error);
}
