import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/user.js";
import { Agent } from "./entities/agent.js";
import { Advertisement } from "./entities/advertisement.js";
import { Agency } from "./entities/agency.js";
import { Appointment } from "./entities/appointment.js";
import { Offer } from "./entities/offer.js";
import { Photo } from "./entities/photo.js";
import { RealEstate } from "./entities/realEstate.js";
import { Token } from "./entities/token.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  entities: [
    Advertisement,
    Agent,
    Agency,
    Appointment,
    Offer,
    Photo,
    RealEstate,
    Token,
    User,
  ],
  migrations: ["db/migrations/*.ts"],

  synchronize: false,
  logging: false,
});

try {
  await AppDataSource.initialize();
} catch (error) {
  console.log(error);
}
