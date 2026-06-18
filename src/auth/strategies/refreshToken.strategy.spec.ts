import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenStrategy } from './refreshToken.strategy';

describe('RefreshTokenStrategy', () => {
  let strategy: RefreshTokenStrategy;

  beforeEach(() => {
    const config = {
      get: jest.fn().mockReturnValue('refresh-secret'),
    } as unknown as ConfigService;

    strategy = new RefreshTokenStrategy(config);
  });

  it('attaches the raw refresh token extracted from the Authorization header', () => {
    const req = {
      get: jest.fn().mockReturnValue('Bearer raw-refresh-token'),
    } as unknown as Request;
    const payload = { sub: 'user-id', username: 'johndoe' };

    const result = strategy.validate(req, payload);

    expect(result).toEqual({
      ...payload,
      refreshToken: 'raw-refresh-token',
    });
  });

  it('returns undefined refreshToken when the header is missing', () => {
    const req = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as Request;
    const payload = { sub: 'user-id', username: 'johndoe' };

    const result = strategy.validate(req, payload);

    expect(result).toEqual({
      ...payload,
      refreshToken: undefined,
    });
  });
});
