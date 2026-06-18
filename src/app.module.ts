import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UsersModule } from './users/users.module';
import configuration from './config/configuration';
import { User } from './users/entities/user.entity';
import { Role } from './roles/entities/role.entity';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { RolesModule } from './roles/roles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        entities: [User, Role],
        synchronize: config.get<boolean>('database.synchronize'),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    HealthModule,
    RolesModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'frontend', 'dist'),
      exclude: ['/api', '/api/*splat', '/docs', '/docs/*splat'],
    }),
  ],
})
export class AppModule {}
