import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from "typeorm";

export class CreateEmergenciesTable1769123456789 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create emergencies table
        await queryRunner.createTable(
            new Table({
                name: 'emergencies',
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
                        name: 'type',
                        type: 'enum',
                        enum: ['ACCIDENT', 'VEHICLE_BREAKDOWN', 'MEDICAL', 'SECURITY_THREAT', 'HARASSMENT', 'ROBBERY', 'OTHER'],
                        default: "'OTHER'",
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['REPORTED', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'FALSE_ALARM'],
                        default: "'REPORTED'",
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'latitude',
                        type: 'decimal',
                        precision: 10,
                        scale: 6,
                        isNullable: true,
                    },
                    {
                        name: 'longitude',
                        type: 'decimal',
                        precision: 10,
                        scale: 6,
                        isNullable: true,
                    },
                    {
                        name: 'address',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'orderId',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'userRole',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'platform',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'adminNotes',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'handledByAdminId',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'acknowledgedAt',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'resolvedAt',
                        type: 'timestamp',
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
                    {
                        name: 'deletedAt',
                        type: 'timestamp',
                        isNullable: true,
                    },
                ],
            }),
            true,
        );

        // Create indexes for common queries
        await queryRunner.createIndex(
            'emergencies',
            new TableIndex({
                name: 'IDX_EMERGENCIES_USER_ID',
                columnNames: ['userId'],
            }),
        );

        await queryRunner.createIndex(
            'emergencies',
            new TableIndex({
                name: 'IDX_EMERGENCIES_STATUS',
                columnNames: ['status'],
            }),
        );

        await queryRunner.createIndex(
            'emergencies',
            new TableIndex({
                name: 'IDX_EMERGENCIES_CREATED_AT',
                columnNames: ['createdAt'],
            }),
        );

        await queryRunner.createIndex(
            'emergencies',
            new TableIndex({
                name: 'IDX_EMERGENCIES_ORDER_ID',
                columnNames: ['orderId'],
            }),
        );

        // Create foreign key for userId
        await queryRunner.createForeignKey(
            'emergencies',
            new TableForeignKey({
                columnNames: ['userId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
            }),
        );

        // Create foreign key for handledByAdminId
        await queryRunner.createForeignKey(
            'emergencies',
            new TableForeignKey({
                columnNames: ['handledByAdminId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'SET NULL',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys
        const table = await queryRunner.getTable('emergencies');
        if (table) {
            const userForeignKey = table.foreignKeys.find(
                (fk) => fk.columnNames.indexOf('userId') !== -1,
            );
            if (userForeignKey) {
                await queryRunner.dropForeignKey('emergencies', userForeignKey);
            }

            const adminForeignKey = table.foreignKeys.find(
                (fk) => fk.columnNames.indexOf('handledByAdminId') !== -1,
            );
            if (adminForeignKey) {
                await queryRunner.dropForeignKey('emergencies', adminForeignKey);
            }
        }

        // Drop indexes
        await queryRunner.dropIndex('emergencies', 'IDX_EMERGENCIES_USER_ID');
        await queryRunner.dropIndex('emergencies', 'IDX_EMERGENCIES_STATUS');
        await queryRunner.dropIndex('emergencies', 'IDX_EMERGENCIES_CREATED_AT');
        await queryRunner.dropIndex('emergencies', 'IDX_EMERGENCIES_ORDER_ID');

        // Drop table
        await queryRunner.dropTable('emergencies');
    }

}
