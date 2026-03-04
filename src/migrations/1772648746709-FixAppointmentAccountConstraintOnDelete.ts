import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAppointmentAccountConstraintOnDelete1772648746709 implements MigrationInterface {
  name = "FixAppointmentAccountConstraintOnDelete1772648746709";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing FK
    await queryRunner.query(`
      ALTER TABLE "appointment"
      DROP CONSTRAINT "FK_appointment_account"
    `);

    // Recreate FK with ON DELETE CASCADE
    await queryRunner.query(`
      ALTER TABLE "appointment"
      ADD CONSTRAINT "FK_appointment_account"
      FOREIGN KEY ("account_id")
      REFERENCES "account"("id")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop CASCADE FK
    await queryRunner.query(`
      ALTER TABLE "appointment"
      DROP CONSTRAINT "FK_appointment_account"
    `);

    // Restore original FK (ON DELETE RESTRICT)
    await queryRunner.query(`
      ALTER TABLE "appointment"
      ADD CONSTRAINT "FK_appointment_account"
      FOREIGN KEY ("account_id")
      REFERENCES "account"("id")
      ON DELETE RESTRICT
    `);
  }
}
