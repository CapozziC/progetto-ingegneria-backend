import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
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

  @Index("UQ_poi_geoapify_place_id", { unique: true })
  @Column({ name: "geoapify_place_id", type: "text", nullable: true })
  geoapifyPlaceId?: string | null;

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
