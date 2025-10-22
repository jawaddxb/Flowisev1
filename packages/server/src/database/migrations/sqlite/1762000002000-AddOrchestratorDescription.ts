import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOrchestratorDescription1762000002000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE orchestrator ADD COLUMN description TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // SQLite doesn't support DROP COLUMN easily
    }
}

