import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

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
}
