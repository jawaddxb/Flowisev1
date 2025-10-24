import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCopilotState1761040800000 implements MigrationInterface {
    name = 'AddCopilotState1761040800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "copilot_state" ("id" varchar PRIMARY KEY NOT NULL, "flowId" varchar NOT NULL, "planType" varchar NOT NULL, "answers" text NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`
        )
        await queryRunner.query(`CREATE INDEX "IDX_copilot_state_flowId" ON "copilot_state" ("flowId") `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_copilot_state_flowId"`)
        await queryRunner.query(`DROP TABLE "copilot_state"`)
    }
}





