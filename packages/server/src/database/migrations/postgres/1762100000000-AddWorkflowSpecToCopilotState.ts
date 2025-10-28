import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddWorkflowSpecToCopilotState1762100000000 implements MigrationInterface {
    name = 'AddWorkflowSpecToCopilotState1762100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "copilot_state" ADD COLUMN "workflowSpec" text`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "copilot_state" DROP COLUMN "workflowSpec"`)
    }
}


