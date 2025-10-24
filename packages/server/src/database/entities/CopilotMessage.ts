/* eslint-disable */
import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'

@Entity()
export class CopilotMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ type: 'uuid' })
    conversationId: string

    @Column({ type: 'text' })
    role: 'user' | 'assistant' | 'system'

    @Column({ type: 'text' })
    content: string

    @Column({ nullable: true, type: 'text' })
    metadata?: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdAt: Date
}






