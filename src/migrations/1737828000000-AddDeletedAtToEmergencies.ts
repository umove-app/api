import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToEmergencies1737828000000 implements MigrationInterface {
    name = 'AddDeletedAtToEmergencies1737828000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if the column already exists before adding it
        const hasDeletedAt = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'emergencies' AND column_name = 'deletedAt'
    `);

        if (hasDeletedAt.length === 0) {
            await queryRunner.query(`
        ALTER TABLE "emergencies" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP
      `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      ALTER TABLE "emergencies" DROP COLUMN IF EXISTS "deletedAt"
    `);
    }
}
