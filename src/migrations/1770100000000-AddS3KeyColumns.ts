import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds stable S3 object-key columns alongside the existing URL columns for
 * driver documents and vehicle documents/photos. URLs are now presigned on
 * read from these keys (the bucket no longer allows public-read ACLs), so the
 * persisted reference must be the immutable key rather than an expiring URL.
 */
export class AddS3KeyColumns1770100000000 implements MigrationInterface {
  name = 'AddS3KeyColumns1770100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "driver_documents" ADD COLUMN IF NOT EXISTS "documentKey" character varying(512)`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "registrationDocumentKey" character varying(512)`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "insuranceDocumentKey" character varying(512)`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "roadworthinessDocumentKey" character varying(512)`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "photoKeys" text array NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "photoKeys"`);
    await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "roadworthinessDocumentKey"`);
    await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "insuranceDocumentKey"`);
    await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "registrationDocumentKey"`);
    await queryRunner.query(`ALTER TABLE "driver_documents" DROP COLUMN IF EXISTS "documentKey"`);
  }
}
