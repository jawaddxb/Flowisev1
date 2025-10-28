import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn, Index } from 'typeorm'

@Entity()
export class CopilotState {
    @PrimaryColumn('uuid')
    id: string

    @Index()
    @Column('varchar')
    flowId: string

    @Column('varchar')
    planType: string

    @Column('text')
    answers: string

    @Column({ type: 'text', nullable: true })
    workflowSpec?: string

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}





