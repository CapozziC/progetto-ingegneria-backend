import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueAgencyPhoneNumber1771595872710 implements MigrationInterface {
  name = "AddUniqueAgencyPhoneNumber1771595872710";
    
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agency"
      ADD CONSTRAINT "UQ_agency_phone_number"
      UNIQUE ("phone_number")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agency"
      DROP CONSTRAINT "UQ_agency_phone_number"
    `);
  }
}