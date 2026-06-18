import { ConfigService } from '@nestjs/config';
import { AccessTokenStrategy } from './accessToken.strategy';
import { JwtPayload } from '../jwt-payload.type';

describe('AccessTokenStrategy', () => {
  let strategy: AccessTokenStrategy;

  beforeEach(() => {
    const config = {
      get: jest.fn().mockReturnValue('access-secret'),
    } as unknown as ConfigService;

    strategy = new AccessTokenStrategy(config);
  });

  it('returns the payload unchanged', () => {
    const payload: JwtPayload = { sub: 'user-id', username: 'johndoe' };

    expect(strategy.validate(payload)).toEqual(payload);
  });
});
