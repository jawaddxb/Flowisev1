import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class OrchestratorRun {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    orchestratorId: string

    @Column({ default: 'PENDING' })
    status: string

    @Column({ type: 'text', nullable: true })
    logs?: string

    @Column({ type: 'text', nullable: true })
    inputs?: string

    @Column({ type: 'text', nullable: true })
    metadata?: string

    @Column({ nullable: true })
    correlationToken?: string

    @Column({ nullable: true })
    startedAt?: Date

    @Column({ nullable: true })
    finishedAt?: Date

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date
}

