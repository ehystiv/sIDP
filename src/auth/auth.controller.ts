import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { RefreshTokenGuard } from '../common/guards/refresh-token.guard';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import { TokensDto } from './dto/tokens.dto';
import { IDPRequest } from './idp-request.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiOkResponse({ type: TokensDto })
  signup(@Body() createUserDto: CreateUserDto) {
    return this.authService.signUp(createUserDto);
  }

  @Post('signin')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Sign in with username and password' })
  @ApiOkResponse({ type: TokensDto })
  signin(@Body() data: AuthDto) {
    return this.authService.signIn(data);
  }

  @Get('refresh')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(RefreshTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Issue a new token pair from a refresh token' })
  @ApiOkResponse({ type: TokensDto })
  refreshTokens(@Req() req: IDPRequest) {
    const userId = req.user.sub;
    const refreshToken = req.user.refreshToken;
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  me(@Req() req: IDPRequest) {
    return this.authService.me(req.user.sub);
  }

  @Get('logout')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate the current refresh token' })
  logout(@Req() req: IDPRequest) {
    return this.authService.logout(req.user.sub);
  }
}
