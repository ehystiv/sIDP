import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Role } from 'src/roles/entities/role.entity';

@Entity()
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty()
  @Column({ type: 'varchar', unique: true })
  name!: string;

  @ApiProperty()
  @Column({ type: 'varchar', unique: true })
  username!: string;

  @ApiHideProperty()
  @Column({ type: 'varchar' })
  @Exclude()
  password!: string;

  @ApiHideProperty()
  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  refreshToken!: string | null;

  @ApiProperty()
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt!: Date;

  @ApiProperty()
  @DeleteDateColumn()
  deletedAt!: Date;

  @ApiProperty({ type: () => Role, isArray: true })
  @ManyToMany(() => Role)
  @JoinTable()
  roles!: Role[];
}
