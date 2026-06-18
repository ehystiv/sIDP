import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { UserRolesController } from './user-roles.controller';
import { Role } from './entities/role.entity';
import { User } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Role, User]), UsersModule],
  controllers: [RolesController, UserRolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
