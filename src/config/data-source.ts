import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT as string, 10) || 5432,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [User, Role],
  migrations: ['src/migrations/*.ts'],
});
