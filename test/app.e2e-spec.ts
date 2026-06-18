import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { UsersService } from 'src/users/users.service';

describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  let usersService: UsersService;
  const username = `e2e-user-${Date.now()}`;
  const password = 'password123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();

    usersService = moduleFixture.get(UsersService);
  });

  afterAll(async () => {
    const user = await usersService.findByUsername(username).catch(() => null);
    if (user) await usersService.removePermanently(user.id);

    await app.close();
  });

  it('signs up a new user without leaking the password hash', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ name: 'E2E User', username, password })
      .expect(201);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body).not.toHaveProperty('password');
  });

  it('rejects signup with a duplicate username', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ name: 'E2E User', username, password })
      .expect(400);
  });

  it('signs in with valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ username, password })
      .expect(201);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });

  it('rejects signin with an invalid password', async () => {
    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ username, password: 'wrong-password' })
      .expect(400);
  });

  it('refreshes tokens with a valid refresh token and rejects the logged-out session afterwards', async () => {
    const signInResponse = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ username, password })
      .expect(201);

    const { refreshToken, accessToken } = signInResponse.body;

    const refreshResponse = await request(app.getHttpServer())
      .get('/auth/refresh')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(200);

    expect(refreshResponse.body).toHaveProperty('accessToken');
    expect(refreshResponse.body).toHaveProperty('refreshToken');

    await request(app.getHttpServer())
      .get('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/auth/refresh')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(403);
  });
});
