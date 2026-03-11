import { MigrationInterface, QueryRunner } from "typeorm";

export class changeDescriptionToText1773214273512 implements MigrationInterface {
  name = "changeDescriptionToText1773214273512";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "advertisement"
      ALTER COLUMN "description" TYPE text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "advertisement"
      ALTER COLUMN "description" TYPE varchar(500)
    `);
  }
}