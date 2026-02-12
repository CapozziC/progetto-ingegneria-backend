import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAgencyEmailRegexCheks1770892090483
  implements MigrationInterface
{
  name = "FixAgencyEmailRegexChecs1770892090483";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1️⃣ Droppa eventuali vecchie CHECK sull'email
    await queryRunner.query(`
      DO $$
      DECLARE r record;
      BEGIN
        FOR r IN
          SELECT c.conname
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          WHERE t.relname = 'agency'
            AND c.contype = 'c'
            AND pg_get_constraintdef(c.oid) LIKE '%email%'
        LOOP
          EXECUTE format('ALTER TABLE "agency" DROP CONSTRAINT IF EXISTS %I;', r.conname);
        END LOOP;
      END $$;
    `);

    // 2️⃣ Ricrea la CHECK corretta
    await queryRunner.query(`
      ALTER TABLE "agency"
      ADD CONSTRAINT "CHK_agency_email"
      CHECK ("email" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agency"
      DROP CONSTRAINT IF EXISTS "CHK_agency_email";
    `);
  }
}
