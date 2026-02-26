import { MigrationInterface, QueryRunner } from "typeorm";

export class AddColumnInRealEsateEntityForGeopify1772105076822 implements MigrationInterface {
  name = "AddColumnInRealEsateEntityForGeopify1772105076822";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "real_estate"
      ADD COLUMN "address_input" text NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "real_estate"
      ADD COLUMN "address_formatted" text NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "real_estate"
      ADD COLUMN "place_id" text NULL
    `);

   
    await queryRunner.query(`
      CREATE INDEX "IDX_real_estate_place_id"
      ON "real_estate" ("place_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_real_estate_place_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "real_estate"
      DROP COLUMN "place_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "real_estate"
      DROP COLUMN "address_formatted"
    `);

    await queryRunner.query(`
      ALTER TABLE "real_estate"
      DROP COLUMN "address_input"
    `);
  }
}