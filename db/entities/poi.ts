import { Entity, PrimaryGeneratedColumn, Column, Check } from "typeorm";
import type { Point } from "geojson";

export enum Type {
  PARK = "park",
  SCHOOL = "school",
  PUBLIC_TRANSPORT = "public_transport",
}

@Entity("poi")
export class Poi {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "enum", enum: Type })
  type!: Type;

  @Column("geometry", {
    spatialFeatureType: "Point",
    srid: 4326,
  })
  location!: Point;
}
