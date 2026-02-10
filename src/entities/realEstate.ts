import { Entity, PrimaryGeneratedColumn, Column, Check } from "typeorm";
import type { Point } from "geojson";

export enum EnergyClass {
  A = "A",
  B = "B",
  C = "C",
  D = "D",
  E = "E",
  F = "F",
  G = "G",
}

export enum Type {
  APARTMENT = "apartment",
  VILLA = "villa",
}

@Entity("real_estate")
@Check(`"size" > 0`)
@Check(`"rooms" > 0`)
export class RealEstate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  size!: number;

  @Column({ type: "int" })
  rooms!: number;

  @Column({ type: "int" })
  floor!: number;

  @Column({ type: "boolean", default: false })
  elevator!: boolean;

  @Column({ name: "air_conditioning", type: "boolean", default: false })
  airConditioning!: boolean;

  @Column({ type: "boolean", default: false })
  heating!: boolean;

  @Column({ type: "boolean", default: false })
  concierge!: boolean;

  @Column({ type: "boolean", default: false })
  parking!: boolean;

  @Column({ type: "boolean", default: false })
  garage!: boolean;

  @Column({ type: "boolean", default: false })
  furnished!: boolean;

  @Column({ name: "solar_panels", type: "boolean", default: false })
  solarPanels!: boolean;

  @Column({ type: "boolean", default: false })
  balcony!: boolean;

  @Column({ type: "boolean", default: false })
  terrace!: boolean;

  @Column({ type: "boolean", default: false })
  garden!: boolean;

  @Column({ name: "energy_class", type: "enum", enum: EnergyClass })
  energyClass!: EnergyClass;

  @Column({ name: "housing_type", type: "enum", enum: Type })
  housingType!: Type;

  @Column("geometry", {
    spatialFeatureType: "Point",
    srid: 4326,
  })
  location!: Point;
}
