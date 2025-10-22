import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOrchestratorRunFields1762000001000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add inputs and metadata columns to orchestrator_run table
        await queryRunner.query(`
            ALTER TABLE orchestrator_run ADD COLUMN inputs TEXT;
        `)
        
        await queryRunner.query(`
            ALTER TABLE orchestrator_run ADD COLUMN metadata TEXT;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // SQLite doesn't support DROP COLUMN directly, would need table recreation
        // For now, leave the columns (they're nullable)
    }
}

