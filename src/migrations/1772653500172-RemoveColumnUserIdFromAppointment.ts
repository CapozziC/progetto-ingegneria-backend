import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveColumnUserIdFromAppointment1772653500172
  implements MigrationInterface
{
  name = "RemoveColumnUserIdFromAppointment1772653500172";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "appointment"
      DROP COLUMN IF EXISTS "user_id";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "appointment"
      ADD COLUMN "user_id" integer;
    `);
  }
}