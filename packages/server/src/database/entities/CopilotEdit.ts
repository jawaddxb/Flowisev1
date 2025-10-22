/* eslint-disable */
import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'

@Entity()
export class CopilotEdit {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ type: 'uuid' })
    flowId: string

    @Index()
    @Column({ type: 'uuid' })
    conversationId: string

    @Column({ type: 'text' })
    operations: string

    @Column({ nullable: true, type: 'text' })
    summary?: string

    @Column({ nullable: true, type: 'text' })
    appliedByUserId?: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdAt: Date
}


