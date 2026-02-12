import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAgentPhoneNumberRegexChecks1770891937339 implements MigrationInterface {
  name = "FixAgentPhoneNumberRegexChecks1770891937339";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Droppa TUTTE le CHECK della tabella agent che contengono regex (~)
    await queryRunner.query(`
      DO $$
      DECLARE r record;
      BEGIN
        FOR r IN
          SELECT c.conname
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          WHERE t.relname = 'agent'
            AND c.contype = 'c'
            AND pg_get_constraintdef(c.oid) LIKE '%~%'
        LOOP
          EXECUTE format('ALTER TABLE "agent" DROP CONSTRAINT IF EXISTS %I;', r.conname);
        END LOOP;
      END $$;
    `);

    // 2) Ricrea le CHECK "buone"
    // Phone E.164: + followed by 8..15 digits total (first digit 1-9)
    await queryRunner.query(`
      ALTER TABLE "agent"
      ADD CONSTRAINT "CHK_agent_phone_number"
      CHECK ("phone_number" ~ '^\\+[1-9][0-9]{7,14}$');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // rollback: elimina solo quelle create da noi
    await queryRunner.query(`
      ALTER TABLE "agent" DROP CONSTRAINT IF EXISTS "CHK_agent_phone_number";
    `);
  }
}
