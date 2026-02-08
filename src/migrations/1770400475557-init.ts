import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1770400475557 implements MigrationInterface {
    name = 'Init1770400475557'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."refresh_token_type_enum" AS ENUM('agent', 'account')`);
        await queryRunner.query(`CREATE TABLE "refresh_token" ("id" text NOT NULL, "subject_id" integer NOT NULL, "type" "public"."refresh_token_type_enum" NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_subjectId_type" UNIQUE ("subject_id", "type"), CONSTRAINT "CHK_fddb1e256fab9d043260d502c6" CHECK ("expires_at" > "created_at"), CONSTRAINT "PK_b575dd3c21fb0831013c909e7fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_refresh_token_subject_type" ON "refresh_token" ("subject_id", "type") `);
        await queryRunner.query(`CREATE TYPE "public"."real_estate_energy_class_enum" AS ENUM('A', 'B', 'C', 'D', 'E', 'F', 'G')`);
        await queryRunner.query(`CREATE TYPE "public"."real_estate_housing_type_enum" AS ENUM('apartment', 'villa')`);
        await queryRunner.query(`CREATE TABLE "real_estate" ("id" SERIAL NOT NULL, "size" integer NOT NULL, "rooms" integer NOT NULL, "floor" integer NOT NULL, "elevator" boolean NOT NULL DEFAULT false, "air_conditioning" boolean NOT NULL DEFAULT false, "heating" boolean NOT NULL DEFAULT false, "concierge" boolean NOT NULL DEFAULT false, "parking" boolean NOT NULL DEFAULT false, "garage" boolean NOT NULL DEFAULT false, "furnished" boolean NOT NULL DEFAULT false, "solar_panels" boolean NOT NULL DEFAULT false, "balcony" boolean NOT NULL DEFAULT false, "terrace" boolean NOT NULL DEFAULT false, "garden" boolean NOT NULL DEFAULT false, "energy_class" "public"."real_estate_energy_class_enum" NOT NULL, "housing_type" "public"."real_estate_housing_type_enum" NOT NULL, "location" geometry(Point,4326) NOT NULL, CONSTRAINT "CHK_8f7383af7c80bdfd3adedec6f5" CHECK ("rooms" > 0), CONSTRAINT "CHK_ddebb98d6434a4d0653456804b" CHECK ("size" > 0), CONSTRAINT "PK_8735a23fd5adc2afb18242894ff" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."poi_type_enum" AS ENUM('park', 'school', 'public_transport')`);
        await queryRunner.query(`CREATE TABLE "poi" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "type" "public"."poi_type_enum" NOT NULL, "location" geometry(Point,4326) NOT NULL, CONSTRAINT "PK_cd39f8194203a7955bbb92161b6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."photo_format_enum" AS ENUM('JPEG', 'JPG', 'PNG', 'HEIC')`);
        await queryRunner.query(`CREATE TABLE "photo" ("id" SERIAL NOT NULL, "format" "public"."photo_format_enum" NOT NULL, "url" text NOT NULL, "position" integer NOT NULL DEFAULT '0', "advertisement_id" integer NOT NULL, CONSTRAINT "CHK_e39fbc3390ba498dbefecc0645" CHECK ("position" >= 0), CONSTRAINT "CHK_4e58294306c10300f6756092f9" CHECK (length(trim("url")) > 0), CONSTRAINT "PK_723fa50bf70dcfd06fb5a44d4ff" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_advertisement_id" ON "photo" ("advertisement_id") `);
        await queryRunner.query(`CREATE TABLE "agent" ("id" SERIAL NOT NULL, "first_name" character varying(30) NOT NULL, "last_name" character varying(30) NOT NULL, "username" text NOT NULL, "password" character varying(255) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "phone_number" character varying(15) NOT NULL, "is_admin" boolean NOT NULL, "is_password_change" boolean NOT NULL DEFAULT false, "agency_id" integer NOT NULL, "administrator_id" integer, CONSTRAINT "UQ_agent_username_agencyId" UNIQUE ("username", "agency_id"), CONSTRAINT "CHK_c75e6fb2af8eff2384d961f9ba" CHECK ("phone_number" ~ '^\+[1-9][0-9]{7,14}$'), CONSTRAINT "CHK_3731b6ac96be0a0c1a5810f3e7" CHECK (length(trim("password")) > 0), CONSTRAINT "CHK_520e6095748adb06c6abe15a11" CHECK (length(trim("last_name")) > 1), CONSTRAINT "CHK_ceeefe0ad37a3f26cca26bb0d9" CHECK (length(trim("first_name")) > 1), CONSTRAINT "PK_1000e989398c5d4ed585cf9a46f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_agent_agency_id" ON "agent" ("agency_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_agent_administrator_id" ON "agent" ("administrator_id") `);
        await queryRunner.query(`CREATE TABLE "agency" ("id" SERIAL NOT NULL, "name" character varying(30) NOT NULL, "phone_number" character varying(15) NOT NULL, "email" character varying(100) NOT NULL, CONSTRAINT "UQ_agency_email" UNIQUE ("email"), CONSTRAINT "UQ_agency_name" UNIQUE ("name"), CONSTRAINT "CHK_49f26e80eaec7d28ea659dd706" CHECK ("email" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'), CONSTRAINT "CHK_2ac12454a539bb0591d175a0f0" CHECK ("phone_number" ~ '^\+[1-9][0-9]{7,14}$'), CONSTRAINT "CHK_a8ac28f5a2c7bcf5aee15812b1" CHECK (length(trim("phone_number")) > 0), CONSTRAINT "CHK_42859fc59904504f1c8d391fc4" CHECK (length(trim("name")) > 1), CONSTRAINT "PK_ab1244724d1c216e9720635a2e5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_agency_name" ON "agency" ("name") `);
        await queryRunner.query(`CREATE TYPE "public"."logo_format_enum" AS ENUM('JPEG', 'JPG', 'PNG', 'HEIC')`);
        await queryRunner.query(`CREATE TABLE "logo" ("id" SERIAL NOT NULL, "format" "public"."logo_format_enum" NOT NULL, "url" text NOT NULL, "agency_id" integer, CONSTRAINT "REL_4a7d827fc869e0fc31d5e72427" UNIQUE ("agency_id"), CONSTRAINT "CHK_0200396e90877195597435d65a" CHECK (length(trim("url")) > 0), CONSTRAINT "PK_d0a6be0ad81359e31b23e1c9498" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."advertisement_status_enum" AS ENUM('active', 'sold')`);
        await queryRunner.query(`CREATE TYPE "public"."advertisement_type_enum" AS ENUM('sale', 'rent')`);
        await queryRunner.query(`CREATE TABLE "advertisement" ("id" SERIAL NOT NULL, "description" character varying(500) NOT NULL, "price" numeric(12,0) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "status" "public"."advertisement_status_enum" NOT NULL DEFAULT 'active', "type" "public"."advertisement_type_enum" NOT NULL, "agent_id" integer NOT NULL, "real_estate_id" integer NOT NULL, CONSTRAINT "REL_65919ad83abbdd34d89a0eee34" UNIQUE ("real_estate_id"), CONSTRAINT "CHK_6fcf98739df26e504783b2228d" CHECK ("price" > 0), CONSTRAINT "CHK_5919607a072d61cba86eba4f7e" CHECK (length(trim("description")) > 0), CONSTRAINT "PK_c8486834e5ef704ec05b7564d89" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_adv_type" ON "advertisement" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_adv_agent_id" ON "advertisement" ("agent_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_adv_real_estate_id" ON "advertisement" ("real_estate_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_adv_status_price" ON "advertisement" ("status", "price") `);
        await queryRunner.query(`CREATE TYPE "public"."account_provider_enum" AS ENUM('google', 'github', 'facebook')`);
        await queryRunner.query(`CREATE TABLE "account" ("id" SERIAL NOT NULL, "first_name" character varying(50) NOT NULL, "last_name" character varying(50) NOT NULL, "email" character varying(100), "password" character varying(255), "provider" "public"."account_provider_enum", "provider_account_id" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_account_id_provider" UNIQUE ("provider_account_id"), CONSTRAINT "UQ_account_email" UNIQUE ("email"), CONSTRAINT "CHK_62728c4cc6f17f03cc904de5b7" CHECK (email IS NULL OR (length(trim(both from email)) > 0 AND trim(both from email) ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')), CONSTRAINT "CHK_862257f75134e0144449359622" CHECK (length(trim("provider_account_id")) > 0 OR provider_account_id IS NULL), CONSTRAINT "CHK_402098a5a48bfad054fa0c0d3c" CHECK (length(trim("last_name")) > 0), CONSTRAINT "CHK_d38994d16aaa4514dbf17675c4" CHECK (length(trim("first_name")) > 0), CONSTRAINT "PK_54115ee388cdb6d86bb4bf5b2ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."offer_status_enum" AS ENUM('pending', 'accepted', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "offer" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "price" numeric(12,0) NOT NULL, "status" "public"."offer_status_enum" NOT NULL DEFAULT 'pending', "advertisement_id" integer NOT NULL, "account_id" integer NOT NULL, "agent_id" integer NOT NULL, "user_id" integer, CONSTRAINT "CHK_7c491b7516c9c03db92ccf1b6c" CHECK ("price" > 0), CONSTRAINT "PK_57c6ae1abe49201919ef68de900" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_offer_status_advertisement_agent" ON "offer" ("status", "advertisement_id", "agent_id") `);
        await queryRunner.query(`CREATE TYPE "public"."appointment_status_enum" AS ENUM('requested', 'confirmed', 'cancelled', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "appointment" ("id" SERIAL NOT NULL, "appointment_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "status" "public"."appointment_status_enum" NOT NULL DEFAULT 'requested', "agent_id" integer NOT NULL, "account_id" integer NOT NULL, "advertisement_id" integer NOT NULL, "user_id" integer, CONSTRAINT "CHK_28bccea339cb0a0927c61e1a1a" CHECK ((status IN ('confirmed', 'cancelled', 'rejected') 
  OR appointment_at > CURRENT_TIMESTAMP)), CONSTRAINT "PK_e8be1a53027415e709ce8a2db74" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_appointmentAt_status_agent" ON "appointment" ("status", "appointment_at", "agent_id") `);
        await queryRunner.query(`CREATE TABLE "advertisement_poi" ("advertisement_id" integer NOT NULL, "poi_id" integer NOT NULL, CONSTRAINT "PK_25e15c46d701c676b802404a504" PRIMARY KEY ("advertisement_id", "poi_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_32bb3580c7007a54ec88fb912e" ON "advertisement_poi" ("advertisement_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_81a4f87a23b99186d8372dacbe" ON "advertisement_poi" ("poi_id") `);
        await queryRunner.query(`ALTER TABLE "photo" ADD CONSTRAINT "FK_photo_advertisement" FOREIGN KEY ("advertisement_id") REFERENCES "advertisement"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agent" ADD CONSTRAINT "FK_agent_agency" FOREIGN KEY ("agency_id") REFERENCES "agency"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agent" ADD CONSTRAINT "FK_agent_administrator" FOREIGN KEY ("administrator_id") REFERENCES "agent"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "logo" ADD CONSTRAINT "FK_logo_agency" FOREIGN KEY ("agency_id") REFERENCES "agency"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "advertisement" ADD CONSTRAINT "FK_advertisement_agent" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "advertisement" ADD CONSTRAINT "FK_advertisement_real_estate" FOREIGN KEY ("real_estate_id") REFERENCES "real_estate"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "offer" ADD CONSTRAINT "FK_offer_advertisement" FOREIGN KEY ("advertisement_id") REFERENCES "advertisement"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "offer" ADD CONSTRAINT "FK_offer_account" FOREIGN KEY ("user_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "offer" ADD CONSTRAINT "FK_offer_agent" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD CONSTRAINT "FK_appointment_account" FOREIGN KEY ("user_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD CONSTRAINT "FK_appointment_advertisement" FOREIGN KEY ("advertisement_id") REFERENCES "advertisement"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD CONSTRAINT "FK_appointment_agent" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "advertisement_poi" ADD CONSTRAINT "FK_advertisement_poi_advertisement" FOREIGN KEY ("advertisement_id") REFERENCES "advertisement"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "advertisement_poi" ADD CONSTRAINT "FK_advertisement_poi" FOREIGN KEY ("poi_id") REFERENCES "poi"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "advertisement_poi" DROP CONSTRAINT "FK_advertisement_poi"`);
        await queryRunner.query(`ALTER TABLE "advertisement_poi" DROP CONSTRAINT "FK_advertisement_poi_advertisement"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP CONSTRAINT "FK_appointment_agent"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP CONSTRAINT "FK_appointment_advertisement"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP CONSTRAINT "FK_appointment_account"`);
        await queryRunner.query(`ALTER TABLE "offer" DROP CONSTRAINT "FK_offer_agent"`);
        await queryRunner.query(`ALTER TABLE "offer" DROP CONSTRAINT "FK_offer_account"`);
        await queryRunner.query(`ALTER TABLE "offer" DROP CONSTRAINT "FK_offer_advertisement"`);
        await queryRunner.query(`ALTER TABLE "advertisement" DROP CONSTRAINT "FK_advertisement_real_estate"`);
        await queryRunner.query(`ALTER TABLE "advertisement" DROP CONSTRAINT "FK_advertisement_agent"`);
        await queryRunner.query(`ALTER TABLE "logo" DROP CONSTRAINT "FK_logo_agency"`);
        await queryRunner.query(`ALTER TABLE "agent" DROP CONSTRAINT "FK_agent_administrator"`);
        await queryRunner.query(`ALTER TABLE "agent" DROP CONSTRAINT "FK_agent_agency"`);
        await queryRunner.query(`ALTER TABLE "photo" DROP CONSTRAINT "FK_photo_advertisement"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_81a4f87a23b99186d8372dacbe"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_32bb3580c7007a54ec88fb912e"`);
        await queryRunner.query(`DROP TABLE "advertisement_poi"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_appointmentAt_status_agent"`);
        await queryRunner.query(`DROP TABLE "appointment"`);
        await queryRunner.query(`DROP TYPE "public"."appointment_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_offer_status_advertisement_agent"`);
        await queryRunner.query(`DROP TABLE "offer"`);
        await queryRunner.query(`DROP TYPE "public"."offer_status_enum"`);
        await queryRunner.query(`DROP TABLE "account"`);
        await queryRunner.query(`DROP TYPE "public"."account_provider_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_adv_status_price"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_adv_real_estate_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_adv_agent_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_adv_type"`);
        await queryRunner.query(`DROP TABLE "advertisement"`);
        await queryRunner.query(`DROP TYPE "public"."advertisement_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."advertisement_status_enum"`);
        await queryRunner.query(`DROP TABLE "logo"`);
        await queryRunner.query(`DROP TYPE "public"."logo_format_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_agency_name"`);
        await queryRunner.query(`DROP TABLE "agency"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_agent_administrator_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_agent_agency_id"`);
        await queryRunner.query(`DROP TABLE "agent"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_advertisement_id"`);
        await queryRunner.query(`DROP TABLE "photo"`);
        await queryRunner.query(`DROP TYPE "public"."photo_format_enum"`);
        await queryRunner.query(`DROP TABLE "poi"`);
        await queryRunner.query(`DROP TYPE "public"."poi_type_enum"`);
        await queryRunner.query(`DROP TABLE "real_estate"`);
        await queryRunner.query(`DROP TYPE "public"."real_estate_housing_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."real_estate_energy_class_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_refresh_token_subject_type"`);
        await queryRunner.query(`DROP TABLE "refresh_token"`);
        await queryRunner.query(`DROP TYPE "public"."refresh_token_type_enum"`);
    }

}
