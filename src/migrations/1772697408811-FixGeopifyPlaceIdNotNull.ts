import { MigrationInterface, QueryRunner } from "typeorm";

export class FixGeoapifyPlaceIdNotNull1772697408811 implements MigrationInterface {
  name = "FixGeoapifyPlaceIdNotNull11772697408811";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "poi"
      ALTER COLUMN "geoapify_place_id" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "poi"
      ALTER COLUMN "geoapify_place_id" DROP NOT NULL
    `);
  }
}