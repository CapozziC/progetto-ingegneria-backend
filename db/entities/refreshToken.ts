import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Check,
  Index,
  PrimaryColumn,
  CreateDateColumn,
} from "typeorm";

export enum Type {
  AGENT = "agent",
  USER = "user",
}

@Entity("refresh_token")
@Check(`"expires_at" > created_at`)
export class RefreshToken {
  @PrimaryColumn({ type: "text" })
  id!: string;

  @Column({ name: "subject_id", type: "int" })
  subjectId!: number;

  @Column({
    type: "enum",
    enum: Type,
  })
  type!: Type;

  @Column({ name: "expires_at", type: "timestamp with time zone" })
  expiresAt!: Date;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp with time zone",
  })
  createdAt!: Date;
}
