import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Widens document URL columns from varchar(255) to text. They now store
 * presigned S3 URLs (with signature/credential/expiry query params) which
 * routinely exceed 255 characters; the old cap caused
 * "value too long for type character varying(255)" on upload.
 */
export class WidenDocumentUrlColumns1770200000000 implements MigrationInterface {
  name = 'WidenDocumentUrlColumns1770200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "driver_documents" ALTER COLUMN "documentUrl" TYPE text`);
    await queryRunner.query(`ALTER TABLE "vehicles" ALTER COLUMN "registrationDocument" TYPE text`);
    await queryRunner.query(`ALTER TABLE "vehicles" ALTER COLUMN "insuranceDocument" TYPE text`);
    await queryRunner.query(`ALTER TABLE "vehicles" ALTER COLUMN "roadworthinessDocument" TYPE text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "roadworthinessDocument" TYPE character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "insuranceDocument" TYPE character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "registrationDocument" TYPE character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "driver_documents" ALTER COLUMN "documentUrl" TYPE character varying(255)`,
    );
  }
}
