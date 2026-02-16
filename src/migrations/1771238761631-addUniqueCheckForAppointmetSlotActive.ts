import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueConstraintForAppointmentSlotActive1771238761631 implements MigrationInterface {
  name = "AddUniqueConstraintForAppointmentSlotActive1771238761631";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_appointment_agent_slot_active"
      ON "appointment" ("agent_id", "appointment_at")
      WHERE "status" IN ('requested', 'confirmed');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_appointmentAt_status_agent";
    `);
  }
}
