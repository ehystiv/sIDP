import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/entities/user.entity';
import * as argon2 from 'argon2';
import { AuthDto } from './dto/auth.dto';

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

// Precomputed argon2 hash used to equalize verification timing when a
// username does not exist, mitigating user-enumeration via timing.
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$UOxxoqQdCj3LcZF15P50Ow$od95g9tMmoupiIg6xLoqPGfhRq8W0sNi5pQtvqcuTc4';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async signUp(createUserDto: CreateUserDto): Promise<Tokens> {
    const userExists = await this.userService.existsUsername(
      createUserDto.username,
    );

    if (userExists) throw new BadRequestException('Username already exists');

    if (
      createUserDto.email &&
      (await this.userService.existsEmail(createUserDto.email))
    ) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await this.hashData(createUserDto.password);

    const newUser = await this.userService.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const tokens = await this.getTokens(newUser.id, newUser.username);

    await this.updateRefreshToken(newUser.id, tokens.refreshToken);

    return tokens;
  }

  async signIn(data: AuthDto): Promise<Tokens> {
    let user: User | null = null;
    try {
      user = await this.userService.findByUsername(data.username);
    } catch {
      user = null;
    }

    // Always run an argon2 verification to avoid leaking whether the username
    // exists via response timing. When the user is missing, verify against a
    // throwaway hash so the comparison cost is comparable.
    const passwordMatches = user
      ? await argon2.verify(user.password, data.password)
      : await argon2
          .verify(DUMMY_PASSWORD_HASH, data.password)
          .catch(() => false);

    if (!user || !passwordMatches)
      throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.getTokens(user.id, user.username);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async me(userId: string): Promise<User> {
    return this.userService.findOneWithRoles(userId);
  }

  async logout(userId: string) {
    return this.userService.updateRefreshToken(userId, null);
  }

  async refreshTokens(userId: string, refreshToken: string) {
    let user: User;
    try {
      user = await this.userService.findOne(userId);
    } catch {
      throw new ForbiddenException('Access Denied');
    }

    if (!user.refreshToken) throw new ForbiddenException('Access Denied');

    const refreshTokenMatches = await argon2.verify(
      user.refreshToken,
      refreshToken,
    );

    if (!refreshTokenMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user.id, user.username);

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  private hashData(data: string): Promise<string> {
    return argon2.hash(data);
  }

  private async getTokens(userId: string, username: string): Promise<Tokens> {
    const accessTtl = this.config.get<string>(
      'jwt.accessTtl',
    ) as JwtSignOptions['expiresIn'];
    const refreshTtl = this.config.get<string>(
      'jwt.refreshTtl',
    ) as JwtSignOptions['expiresIn'];
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          username,
        },
        {
          secret: this.config.get<string>('jwt.secret'),
          expiresIn: accessTtl,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          username,
        },
        {
          secret: this.config.get<string>('jwt.refresh_secret'),
          expiresIn: refreshTtl,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await this.hashData(refreshToken);
    await this.userService.updateRefreshToken(userId, hashedRefreshToken);
  }
}
