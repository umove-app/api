import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from "typeorm";

export class CreateAppRatingsTable1768935637480 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create app_ratings table
        await queryRunner.createTable(
            new Table({
                name: 'app_ratings',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'userId',
                        type: 'uuid',
                    },
                    {
                        name: 'rating',
                        type: 'integer',
                    },
                    {
                        name: 'comment',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'easeOfUse',
                        type: 'integer',
                        isNullable: true,
                    },
                    {
                        name: 'features',
                        type: 'integer',
                        isNullable: true,
                    },
                    {
                        name: 'performance',
                        type: 'integer',
                        isNullable: true,
                    },
                    {
                        name: 'design',
                        type: 'integer',
                        isNullable: true,
                    },
                    {
                        name: 'platform',
                        type: 'varchar',
                        length: '50',
                    },
                    {
                        name: 'appVersion',
                        type: 'varchar',
                        length: '20',
                        isNullable: true,
                    },
                    {
                        name: 'deviceModel',
                        type: 'varchar',
                        length: '20',
                        isNullable: true,
                    },
                    {
                        name: 'metadata',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Create index on userId
        await queryRunner.createIndex(
            'app_ratings',
            new TableIndex({
                name: 'IDX_APP_RATINGS_USER_ID',
                columnNames: ['userId'],
            }),
        );

        // Create foreign key for userId
        await queryRunner.createForeignKey(
            'app_ratings',
            new TableForeignKey({
                columnNames: ['userId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key
        const table = await queryRunner.getTable('app_ratings');
        if (table) {
            const foreignKey = table.foreignKeys.find(
                (fk) => fk.columnNames.indexOf('userId') !== -1,
            );
            if (foreignKey) {
                await queryRunner.dropForeignKey('app_ratings', foreignKey);
            }
        }

        // Drop index
        await queryRunner.dropIndex('app_ratings', 'IDX_APP_RATINGS_USER_ID');

        // Drop table
        await queryRunner.dropTable('app_ratings');
    }

}
