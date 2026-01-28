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

export enum OutdoorSpace {
  NONE = "none",
  BALCONY = "balcony",
  TERRACE = "terrace",
  GARDEN = "garden",
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

  @Column()
  floor!: string;
  

  @Column({ default: false })
  elevator!: boolean;

  @Column({ default: false })
  airConditioning!: boolean;

  @Column({ default: false })
  heating!: boolean;

  @Column({ default: false })
  concierge!: boolean;

  @Column({ default: false })
  parking!: boolean;

  @Column({ default: false })
  garage!: boolean;

  @Column({ default: false })
  furnished!: boolean;

  @Column({ default: false })
  solarPanels!: boolean;

  @Column({ type: "enum", enum: EnergyClass })
  energyClass!: EnergyClass;

  @Column({ type: "enum", enum: OutdoorSpace })
  outdoorSpace!: OutdoorSpace;

  @Column({ type: "enum", enum: Type })
  housingType!: Type;

  @Column("geometry", {
    spatialFeatureType: "Point",
    srid: 4326,
  })
  location!: Point;

  
}
