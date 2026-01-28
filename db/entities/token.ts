import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Check,
  Index,
} from "typeorm";

export enum Type {
  AGENT = "agent",
  USER = "user",
}

@Entity("token")
export class Token {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "subject_id", type: "int" })
  subjectId!: number;

  @Column({
    type: "enum",
    enum: Type,
  })
  type!: Type;

  @Index("IDX_refresh_token", ["refreshToken"])
  @Column({ name: "refresh_token" })
  refreshToken!: string;

  @Column({ name: "expires_at", type: "timestamp with time zone" })
  expiresAt!: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamp with time zone",
  })
  updatedAt!: Date;
}
