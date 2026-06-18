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
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { IDPRequest } from '../auth/idp-request.interface';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiQuery({
    name: 'trashed',
    required: false,
    type: Boolean,
    description: 'Include soft-deleted users',
  })
  findAll(@Query('trashed') trashed: boolean) {
    return this.usersService.findAll(trashed);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
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

  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete your own account' })
  remove(@Param('id') id: string, @Req() req: IDPRequest) {
    if (req.user.sub !== id) {
      throw new ForbiddenException('You can only delete your own account');
    }
    return this.usersService.remove(id);
  }
}
