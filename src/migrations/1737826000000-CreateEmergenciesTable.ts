import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmergenciesTable1737826000000 implements MigrationInterface {
    name = 'CreateEmergenciesTable1737826000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create emergency_status enum type if it doesn't exist
        await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."emergencies_status_enum" AS ENUM('REPORTED', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'FALSE_ALARM');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

        // Create emergency_type enum type if it doesn't exist
        await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."emergencies_type_enum" AS ENUM('ACCIDENT', 'VEHICLE_BREAKDOWN', 'MEDICAL', 'SECURITY_THREAT', 'HARASSMENT', 'ROBBERY', 'OTHER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

        // Create emergencies table
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "emergencies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "userId" uuid NOT NULL,
        "type" "public"."emergencies_type_enum" NOT NULL DEFAULT 'OTHER',
        "status" "public"."emergencies_status_enum" NOT NULL DEFAULT 'REPORTED',
        "description" text,
        "latitude" decimal(10,6),
        "longitude" decimal(10,6),
        "address" varchar(255),
        "orderId" uuid,
        "userRole" varchar(50),
        "platform" varchar(50),
        "adminNotes" text,
        "handledByAdminId" uuid,
        "acknowledgedAt" TIMESTAMP,
        "resolvedAt" TIMESTAMP,
        "metadata" jsonb,
        CONSTRAINT "PK_emergencies" PRIMARY KEY ("id")
      );
    `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_emergencies_userId" ON "emergencies" ("userId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_emergencies_status" ON "emergencies" ("status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_emergencies_createdAt" ON "emergencies" ("createdAt")`);

        // Add foreign key constraints
        await queryRunner.query(`
      ALTER TABLE "emergencies" 
      ADD CONSTRAINT "FK_emergencies_userId" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

        await queryRunner.query(`
      ALTER TABLE "emergencies" 
      ADD CONSTRAINT "FK_emergencies_handledByAdminId" 
      FOREIGN KEY ("handledByAdminId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "emergencies" DROP CONSTRAINT IF EXISTS "FK_emergencies_handledByAdminId"`);
        await queryRunner.query(`ALTER TABLE "emergencies" DROP CONSTRAINT IF EXISTS "FK_emergencies_userId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_emergencies_createdAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_emergencies_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_emergencies_userId"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "emergencies"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."emergencies_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."emergencies_type_enum"`);
    }
}
