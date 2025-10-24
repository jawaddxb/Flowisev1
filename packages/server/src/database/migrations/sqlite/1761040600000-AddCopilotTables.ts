import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCopilotTables1761040600000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create CopilotConversation table
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "copilot_conversation" (
                "id" varchar PRIMARY KEY NOT NULL,
                "flowId" varchar NOT NULL,
                "workspaceId" text,
                "createdByUserId" text,
                "status" text NOT NULL DEFAULT ('active'),
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
            );`
        )
        
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_copilot_conversation_flowId" ON "copilot_conversation" ("flowId");`
        )
        
        // Create CopilotMessage table
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "copilot_message" (
                "id" varchar PRIMARY KEY NOT NULL,
                "conversationId" varchar NOT NULL,
                "role" text NOT NULL,
                "content" text NOT NULL,
                "metadata" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
            );`
        )
        
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_copilot_message_conversationId" ON "copilot_message" ("conversationId");`
        )
        
        // Create CopilotEdit table
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "copilot_edit" (
                "id" varchar PRIMARY KEY NOT NULL,
                "flowId" varchar NOT NULL,
                "conversationId" varchar NOT NULL,
                "operations" text NOT NULL,
                "summary" text,
                "appliedByUserId" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
            );`
        )
        
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_copilot_edit_flowId" ON "copilot_edit" ("flowId");`
        )
        
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_copilot_edit_conversationId" ON "copilot_edit" ("conversationId");`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_copilot_edit_conversationId";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_copilot_edit_flowId";`)
        await queryRunner.query(`DROP TABLE IF EXISTS "copilot_edit";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_copilot_message_conversationId";`)
        await queryRunner.query(`DROP TABLE IF EXISTS "copilot_message";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_copilot_conversation_flowId";`)
        await queryRunner.query(`DROP TABLE IF EXISTS "copilot_conversation";`)
    }
}





