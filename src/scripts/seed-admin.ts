import { NestFactory } from '@nestjs/core';
import * as argon2 from 'argon2';
import { AppModule } from 'src/app.module';
import { UsersService } from 'src/users/users.service';
import { RolesService } from 'src/roles/roles.service';

const ADMIN_ROLE_NAME = 'admin';

function readArg(flag: string): string | undefined {
  const prefix = `--${flag}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg?.slice(prefix.length);
}

async function bootstrap() {
  const username = readArg('username') ?? process.env.ADMIN_USERNAME;
  const password = readArg('password') ?? process.env.ADMIN_PASSWORD;
  const name = readArg('name') ?? process.env.ADMIN_NAME ?? 'Admin';

  if (!username || !password) {
    console.error(
      'Usage: pnpm run seed:admin -- --username=<username> --password=<password> [--name=<name>]\n' +
        '(or set ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_NAME env vars)',
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const usersService = app.get(UsersService);
    const rolesService = app.get(RolesService);

    let role = (await rolesService.findAll()).find(
      (r) => r.name === ADMIN_ROLE_NAME,
    );
    if (!role) {
      role = await rolesService.create({ name: ADMIN_ROLE_NAME });
      console.log(`Created role "${ADMIN_ROLE_NAME}"`);
    }

    const userExists = await usersService.existsUsername(username);
    let userId: string;
    if (userExists) {
      userId = (await usersService.findByUsername(username)).id;
      console.log(`User "${username}" already exists, reusing it`);
    } else {
      const hashedPassword = await argon2.hash(password);
      const created = await usersService.create({
        name,
        username,
        password: hashedPassword,
      });
      userId = created.id;
      console.log(`Created user "${username}"`);
    }

    await rolesService.assignToUser(userId, role.id);
    console.log(`Assigned role "${ADMIN_ROLE_NAME}" to "${username}"`);
  } finally {
    await app.close();
  }
}

bootstrap();
