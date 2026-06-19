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
import { RolesService } from 'src/roles/roles.service';

describe('Users & Roles (e2e)', () => {
  let app: INestApplication;
  let usersService: UsersService;
  let rolesService: RolesService;

  const suffix = Date.now();
  const adminUsername = `e2e-admin-${suffix}`;
  const memberUsername = `e2e-member-${suffix}`;
  const otherUsername = `e2e-other-${suffix}`;
  const password = 'Str0ng!Pass';
  const roleName = `e2e-role-${suffix}`;

  let adminToken: string;
  let memberToken: string;
  let otherToken: string;
  let memberId: string;
  let otherId: string;
  let roleId: string;

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
    rolesService = moduleFixture.get(RolesService);

    const adminSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ name: 'E2E Admin', username: adminUsername, password });
    adminToken = adminSignup.body.accessToken;
    const adminUser = await usersService.findByUsername(adminUsername);

    const existingRoles = await rolesService.findAll({ page: 1, limit: 100 });
    const adminRole =
      existingRoles.data.find((role) => role.name === 'admin') ??
      (await rolesService.create({ name: 'admin' }));
    await rolesService.assignToUser(adminUser.id, adminRole.id);

    const memberSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ name: 'E2E Member', username: memberUsername, password });
    memberToken = memberSignup.body.accessToken;
    memberId = (await usersService.findByUsername(memberUsername)).id;

    const otherSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ name: 'E2E Other', username: otherUsername, password });
    otherToken = otherSignup.body.accessToken;
    otherId = (await usersService.findByUsername(otherUsername)).id;
  });

  afterAll(async () => {
    for (const username of [adminUsername, memberUsername, otherUsername]) {
      const user = await usersService
        .findByUsername(username)
        .catch(() => null);
      if (user) await usersService.removePermanently(user.id);
    }
    if (roleId) await rolesService.remove(roleId).catch(() => null);

    await app.close();
  });

  describe('GET /users (admin only)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });

    it('rejects non-admin users', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('allows admin users', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('GET /users/:id', () => {
    it('allows a user to view their own account', async () => {
      await request(app.getHttpServer())
        .get(`/users/${memberId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
    });

    it('rejects a non-admin user viewing another account', async () => {
      await request(app.getHttpServer())
        .get(`/users/${otherId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('rejects a non-admin user viewing another account (reverse direction)', async () => {
      await request(app.getHttpServer())
        .get(`/users/${memberId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('allows an admin to view another account', async () => {
      await request(app.getHttpServer())
        .get(`/users/${memberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('PATCH /users/:id', () => {
    it('allows a user to update their own account', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${memberId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Updated Member' })
        .expect(200);
    });

    it("rejects updating another user's account", async () => {
      await request(app.getHttpServer())
        .patch(`/users/${otherId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Hijacked' })
        .expect(403);
    });
  });

  describe('Roles CRUD (admin only)', () => {
    it('rejects role creation without admin rights', async () => {
      await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: roleName })
        .expect(403);
    });

    it('creates a role as admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: roleName, description: 'E2E role' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      roleId = response.body.id;
    });

    it('lists roles as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('updates a role as admin', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated description' })
        .expect(200);

      expect(response.body.description).toBe('Updated description');
    });
  });

  describe('Assigning roles to users', () => {
    it('rejects assignment without admin rights', async () => {
      await request(app.getHttpServer())
        .post(`/users/${memberId}/roles/${roleId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('assigns a role to a user as admin', async () => {
      const response = await request(app.getHttpServer())
        .post(`/users/${memberId}/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(
        response.body.roles.some((role: { id: string }) => role.id === roleId),
      ).toBe(true);
    });

    it('removes a role from a user as admin', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/users/${memberId}/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(
        response.body.roles.some((role: { id: string }) => role.id === roleId),
      ).toBe(false);
    });

    it('deletes the role as admin', async () => {
      await request(app.getHttpServer())
        .delete(`/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      roleId = '';
    });
  });
});
