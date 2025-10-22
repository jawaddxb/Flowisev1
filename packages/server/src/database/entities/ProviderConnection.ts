import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class ProviderConnection {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    workspaceId: string

    @Column()
    provider: string

    @Column({ type: 'text' })
    credentials: string

    @Column({ default: 'ACTIVE' })
    status: string

    @Column({ nullable: true })
    lastSync?: Date

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date
}

