import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthDto } from './dto/auth.dto';
import { IDPRequest } from './idp-request.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  const tokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            signUp: jest.fn(),
            signIn: jest.fn(),
            refreshTokens: jest.fn(),
            logout: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    it('delegates to the service and returns tokens', async () => {
      const dto: CreateUserDto = {
        name: 'John Doe',
        username: 'johndoe',
        password: 'password123',
      };
      service.signUp.mockResolvedValue(tokens);

      const result = await controller.signup(dto);

      expect(service.signUp).toHaveBeenCalledWith(dto);
      expect(result).toEqual(tokens);
    });
  });

  describe('signin', () => {
    it('delegates to the service and returns tokens', async () => {
      const dto: AuthDto = { username: 'johndoe', password: 'password123' };
      service.signIn.mockResolvedValue(tokens);

      const result = await controller.signin(dto);

      expect(service.signIn).toHaveBeenCalledWith(dto);
      expect(result).toEqual(tokens);
    });
  });

  describe('refreshTokens', () => {
    it('extracts sub and refreshToken from the request and delegates to the service', async () => {
      service.refreshTokens.mockResolvedValue(tokens);
      const req = {
        user: {
          sub: 'user-id',
          username: 'johndoe',
          refreshToken: 'raw-token',
        },
      } as unknown as IDPRequest;

      const result = await controller.refreshTokens(req);

      expect(service.refreshTokens).toHaveBeenCalledWith(
        'user-id',
        'raw-token',
      );
      expect(result).toEqual(tokens);
    });
  });

  describe('logout', () => {
    it('delegates to the service with the requester id', async () => {
      service.logout.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });
      const req = {
        user: { sub: 'user-id', username: 'johndoe' },
      } as unknown as IDPRequest;

      await controller.logout(req);

      expect(service.logout).toHaveBeenCalledWith('user-id');
    });
  });
});
