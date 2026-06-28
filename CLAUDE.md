# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

sIDP (SimpleIDP) is a tiny, ready-to-use Identity Provider built on NestJS, backed by PostgreSQL via TypeORM.

## Commands

Package manager: pnpm is recommended (pnpm-lock.yaml is checked in), though npm/yarn also work.

- `pnpm run start:dev` — run the app in watch mode (most common during development)
- `pnpm run build` — compile via `nest build`
- `pnpm run lint` — eslint with `--fix` over `src`, `apps`, `libs`, `test`
- `pnpm run format` — prettier `--write` over `src/**/*.ts` and `test/**/*.ts`
- `pnpm run test` — unit tests (Jest, rootDir `src`, matches `*.spec.ts`)
- `pnpm run test:watch` — unit tests in watch mode
- `pnpm run test:cov` — unit tests with coverage
- `pnpm run test:e2e` — e2e tests using `test/jest-e2e.json` config
- Run a single unit test file: `pnpm exec jest src/path/to/file.spec.ts`
- Run a single e2e test file: `pnpm exec jest --config ./test/jest-e2e.json test/path/to/file.spec.ts`
- `pnpm run seed:admin -- --username=<u> --password=<p> [--name=<n>]` — standalone script (`src/scripts/seed-admin.ts`) that bootstraps the first admin: creates the `admin` role if missing, creates the user if missing (or reuses an existing one with that username), and assigns the role. Idempotent — safe to re-run. Credentials can also be passed via `ADMIN_USERNAME`/`ADMIN_PASSWORD`/`ADMIN_NAME` env vars. This is the only way to bootstrap an admin since all `roles`/`users` write endpoints are guarded behind an existing admin.

The app requires a running PostgreSQL instance and a `.env` file (see `.env.example`). A root `docker-compose.yml` is available to spin up app + Postgres together.

A Vue 3 + Vite admin SPA lives in `frontend/` (separate `package.json`, not a pnpm workspace member). `pnpm run build:all` builds the frontend then the backend; `pnpm run build:frontend` builds only the SPA into `frontend/dist`, which the backend serves at `/` in production via `@nestjs/serve-static`. During `start:dev`, run the SPA separately with `pnpm --dir frontend dev` (Vite proxies `/api` to `http://localhost:3000`, see `frontend/vite.config.ts`).

## Architecture

Standard NestJS module layout under `src/`, each feature as a module with controller/service/dto:

- **`config/configuration.ts`** — single source of typed config (`app`, `database`, `jwt` namespaces) loaded via `@nestjs/config` from environment variables; read elsewhere with `ConfigService.get('namespace.key')`.
- **`app.module.ts`** — wires `ConfigModule` (global) and `TypeOrmModule.forRootAsync` (Postgres connection built from `ConfigService`), then imports `UsersModule`, `AuthModule`, `HealthModule`, `RolesModule`, and `ServeStaticModule` (serves `frontend/dist` at `/`, excluding `/api*` and `/docs*`).
- **`main.ts`** sets a global route prefix `api` (`app.setGlobalPrefix('api')`), so every controller below is actually mounted under `/api/...`; Swagger UI is at `/docs` (not `/api`, to avoid colliding with the prefix).
- **`users/`** — `User` TypeORM entity (uuid pk, unique `username`, hashed `password`, nullable `refreshToken`, soft-delete via `deletedAt`, many-to-many `roles`). `UsersService` is the only place that touches the `User` repository (create/find/update/soft-delete/hard-delete; `findOneWithRoles` loads the `roles` relation for the `RolesGuard`). `UsersController` exposes CRUD-ish REST endpoints under `/api/users`; write/delete routes are gated by `AccessTokenGuard` and restricted to the caller's own account (`req.user.sub === id`), but `GET` routes (including by-id) are currently public.
- **`auth/`** — implements signup/signin/refresh/logout against `UsersService`:
  - `AuthService` hashes passwords/refresh tokens with `argon2`, issues an access token (15m) and refresh token (7d) signed with separate secrets (`jwt.secret` / `jwt.refresh_secret` from config), and persists the hashed refresh token on the user record for rotation/invalidation.
  - Two Passport strategies: `AccessTokenStrategy` (`'jwt'`) validates the access token; `RefreshTokenStrategy` (`'jwt-refresh'`) validates the refresh token and also attaches the raw refresh token from the `Authorization` header onto the validated payload (needed to compare against the stored hash).
  - `AccessTokenGuard` / `RefreshTokenGuard` in `common/guards/` are thin `AuthGuard()` wrappers around those two strategies — use these (not raw `AuthGuard('jwt')`) when protecting routes.
  - `IDPRequest` (in `auth/idp-request.interface.ts`) is the typed `Request` shape (`req.user`) to use in controllers after either guard runs.
- **`roles/`** — custom, runtime-modifiable roles (not a fixed enum). `Role` entity (uuid pk, unique `name`, nullable `description`) in a many-to-many with `User`. `RolesService` does role CRUD plus `assignToUser`/`removeFromUser`. `RolesController` (`/api/roles`) and `UserRolesController` (`/api/users/:userId/roles/:roleId`) are both gated by `AccessTokenGuard` + `RolesGuard` + `@Roles('admin')`.
- **`common/guards/roles.guard.ts`** + **`common/decorators/roles.decorator.ts`** — `RolesGuard` reads required role names set via `@Roles(...)` and re-fetches the caller's roles from the database on every request (via `UsersService.findOneWithRoles`), not from the JWT payload, so role changes take effect immediately without waiting for token refresh.
- **`health/`** — `GET /api/health` (public, no guard) via `@nestjs/terminus`, pings the Postgres connection.
- Auth endpoints (`POST /api/auth/signup`, `POST /api/auth/signin`, `GET /api/auth/refresh`, `GET /api/auth/logout`) and the other REST endpoints above follow standard Nest DTO validation via classes in each module's `dto/` folder, enforced by a global `ValidationPipe` registered in `main.ts`.

## Conventions

- ESLint extends `@typescript-eslint/recommended` + `prettier/recommended`; `explicit-function-return-type`, `explicit-module-boundary-types`, `no-explicit-any`, and `interface-name-prefix` rules are all turned off.
- Prettier: single quotes, trailing commas everywhere (`.prettierrc`).
- Imports across modules use the `src/...` absolute-style path (e.g. `import { UsersService } from 'src/users/users.service'`) rather than relative `../../`.
