import {
  Entity,
  Column,
  Check,
  PrimaryColumn,
  CreateDateColumn,
  Index,
  Unique,
} from "typeorm";

export enum Type {
  AGENT = "agent",
  ACCOUNT = "account",
}

@Entity("refresh_token")
@Check(`"expires_at" > "created_at"`)
@Index("idx_refresh_token_subject_type", ["subjectId", "type"])
@Unique("UQ_subjectId_type", ["subjectId", "type"])
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
