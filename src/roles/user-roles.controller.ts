import { Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles('admin')
@Controller('users/:userId/roles')
export class UserRolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post(':roleId')
  @ApiOperation({ summary: 'Assign a role to a user' })
  assign(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    return this.rolesService.assignToUser(userId, roleId);
  }

  @Delete(':roleId')
  @ApiOperation({ summary: 'Remove a role from a user' })
  remove(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    return this.rolesService.removeFromUser(userId, roleId);
  }
}
