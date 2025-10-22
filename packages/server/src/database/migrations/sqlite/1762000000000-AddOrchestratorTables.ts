import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOrchestratorTables1762000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS orchestrator (
                id varchar PRIMARY KEY NOT NULL,
                name varchar NOT NULL,
                definition text NOT NULL,
                workspaceId varchar,
                createdDate datetime(6) NOT NULL DEFAULT (datetime('now')),
                updatedDate datetime(6) NOT NULL DEFAULT (datetime('now'))
            );`
        )

        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS orchestrator_run (
                id varchar PRIMARY KEY NOT NULL,
                orchestratorId varchar NOT NULL,
                status varchar NOT NULL DEFAULT 'PENDING',
                logs text,
                correlationToken varchar,
                startedAt datetime,
                finishedAt datetime,
                createdDate datetime(6) NOT NULL DEFAULT (datetime('now')),
                updatedDate datetime(6) NOT NULL DEFAULT (datetime('now'))
            );`
        )

        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS provider_connection (
                id varchar PRIMARY KEY NOT NULL,
                workspaceId varchar NOT NULL,
                provider varchar NOT NULL,
                credentials text NOT NULL,
                status varchar NOT NULL DEFAULT 'ACTIVE',
                lastSync datetime,
                createdDate datetime(6) NOT NULL DEFAULT (datetime('now')),
                updatedDate datetime(6) NOT NULL DEFAULT (datetime('now'))
            );`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS provider_connection;`)
        await queryRunner.query(`DROP TABLE IF EXISTS orchestrator_run;`)
        await queryRunner.query(`DROP TABLE IF EXISTS orchestrator;`)
    }
}

