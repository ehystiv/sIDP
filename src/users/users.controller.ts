import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { IDPRequest } from '../auth/idp-request.interface';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiQuery({
    name: 'trashed',
    required: false,
    type: Boolean,
    description: 'Include soft-deleted users',
  })
  findAll(
    @Query() pagination: PaginationQueryDto,
    @Query('trashed') trashed: boolean,
  ) {
    return this.usersService.findAll(pagination, trashed);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id (self or admin)' })
  async findOne(@Param('id') id: string, @Req() req: IDPRequest) {
    if (req.user.sub !== id) {
      const caller = await this.usersService.findOneWithRoles(req.user.sub);
      const isAdmin = caller.roles.some((role) => role.name === 'admin');
      if (!isAdmin) {
        throw new ForbiddenException('You can only view your own account');
      }
    }
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update your own account' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: IDPRequest,
  ) {
    if (req.user.sub !== id) {
      throw new ForbiddenException('You can only update your own account');
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Change your own password' })
  changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: IDPRequest,
  ) {
    if (req.user.sub !== id) {
      throw new ForbiddenException('You can only change your own password');
    }
    return this.usersService.changePassword(id, changePasswordDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete your own account' })
  remove(@Param('id') id: string, @Req() req: IDPRequest) {
    if (req.user.sub !== id) {
      throw new ForbiddenException('You can only delete your own account');
    }
    return this.usersService.remove(id);
  }
}
