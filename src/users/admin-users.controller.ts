import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin-users')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles('admin')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a user (admin only)' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.adminCreate(createUserDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update any user (admin only)' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: "Reset any user's password (admin only)" })
  resetPassword(
    @Param('id') id: string,
    @Body() { newPassword }: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(id, newPassword);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted user (admin only)' })
  restore(@Param('id') id: string) {
    return this.usersService.restore(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete any user (admin only)' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Delete(':id/permanent')
  @ApiOperation({ summary: 'Permanently delete any user (admin only)' })
  removePermanently(@Param('id') id: string) {
    return this.usersService.removePermanently(id);
  }
}
