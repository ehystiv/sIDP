import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

const mockedArgon2 = argon2 as jest.Mocked<typeof argon2>;
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthDto } from './dto/auth.dto';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser: User = {
    id: 'user-id',
    name: 'John Doe',
    username: 'johndoe',
    email: null,
    password: 'hashed-password',
    refreshToken: 'hashed-refresh-token',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null as unknown as Date,
    roles: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            existsUsername: jest.fn(),
            create: jest.fn(),
            findByUsername: jest.fn(),
            findOne: jest.fn(),
            updateRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'jwt.secret') return 'access-secret';
              if (key === 'jwt.refresh_secret') return 'refresh-secret';
              if (key === 'jwt.accessTtl') return '15m';
              if (key === 'jwt.refreshTtl') return '7d';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);

    jwtService.signAsync.mockImplementation((payload, options) =>
      Promise.resolve(`token-${(options as { expiresIn: string }).expiresIn}`),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signUp', () => {
    const dto: CreateUserDto = {
      name: 'John Doe',
      username: 'johndoe',
      password: 'password123',
    };

    it('throws BadRequestException when the username already exists', async () => {
      usersService.existsUsername.mockResolvedValue(true);

      await expect(service.signUp(dto)).rejects.toThrow(BadRequestException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('creates the user with a hashed password and returns tokens', async () => {
      usersService.existsUsername.mockResolvedValue(false);
      mockedArgon2.hash.mockResolvedValue('hashed-password' as never);
      usersService.create.mockResolvedValue(mockUser);
      usersService.updateRefreshToken.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      const result = await service.signUp(dto);

      expect(usersService.create).toHaveBeenCalledWith({
        ...dto,
        password: 'hashed-password',
      });
      expect(result).toEqual({
        accessToken: 'token-15m',
        refreshToken: 'token-7d',
      });
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(String),
      );
    });
  });

  describe('signIn', () => {
    const dto: AuthDto = { username: 'johndoe', password: 'password123' };

    it('throws UnauthorizedException when the user does not exist', async () => {
      usersService.findByUsername.mockRejectedValue(new Error('not found'));
      mockedArgon2.verify.mockResolvedValue(false as never);

      await expect(service.signIn(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      usersService.findByUsername.mockResolvedValue(mockUser);
      mockedArgon2.verify.mockResolvedValue(false as never);

      await expect(service.signIn(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens when credentials are valid', async () => {
      usersService.findByUsername.mockResolvedValue(mockUser);
      mockedArgon2.verify.mockResolvedValue(true as never);
      mockedArgon2.hash.mockResolvedValue('hashed-refresh' as never);
      usersService.updateRefreshToken.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      const result = await service.signIn(dto);

      expect(result).toEqual({
        accessToken: 'token-15m',
        refreshToken: 'token-7d',
      });
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        'hashed-refresh',
      );
    });
  });

  describe('logout', () => {
    it('clears the stored refresh token', async () => {
      usersService.updateRefreshToken.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      await service.logout('user-id');

      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        'user-id',
        null,
      );
    });
  });

  describe('refreshTokens', () => {
    it('throws ForbiddenException when the user cannot be found', async () => {
      usersService.findOne.mockRejectedValue(new Error('not found'));

      await expect(
        service.refreshTokens('user-id', 'refresh-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when the user has no stored refresh token', async () => {
      usersService.findOne.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      await expect(
        service.refreshTokens('user-id', 'refresh-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when the refresh token does not match', async () => {
      usersService.findOne.mockResolvedValue(mockUser);
      mockedArgon2.verify.mockResolvedValue(false as never);

      await expect(
        service.refreshTokens('user-id', 'refresh-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns new tokens when the refresh token matches', async () => {
      usersService.findOne.mockResolvedValue(mockUser);
      mockedArgon2.verify.mockResolvedValue(true as never);
      mockedArgon2.hash.mockResolvedValue('hashed-refresh' as never);
      usersService.updateRefreshToken.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      const result = await service.refreshTokens('user-id', 'refresh-token');

      expect(result).toEqual({
        accessToken: 'token-15m',
        refreshToken: 'token-7d',
      });
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        'hashed-refresh',
      );
    });
  });
});
