import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAppointmentUniqueSlotIndex1771239460262 implements MigrationInterface {
  name = "FixAppointmentUniqueSlotIndex1771239460262";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_appointment_agent_slot_active"
      ON "appointment" ("agent_id", "appointment_at")
      WHERE "status" IN ('requested', 'confirmed');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_appointment_agent_slot_active";
    `);
  }
}
