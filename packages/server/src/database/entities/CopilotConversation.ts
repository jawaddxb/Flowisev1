/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'

@Entity()
export class CopilotConversation {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ type: 'uuid' })
    flowId: string

    @Column({ nullable: true, type: 'text' })
    workspaceId?: string

    @Column({ nullable: true, type: 'text' })
    createdByUserId?: string

    @Column({ default: 'active', type: 'text' })
    status: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdAt: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedAt: Date
}


