import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Workflow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('json')
  definition: any;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
