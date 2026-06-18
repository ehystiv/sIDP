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

The app requires a running PostgreSQL instance and a `.env` file (see `.env.example`). A `.devcontainer` config and root `docker-compose.yml` are available to spin up app + Postgres together.

## Architecture

Standard NestJS module layout under `src/`, each feature as a module with controller/service/dto:

- **`config/configuration.ts`** — single source of typed config (`app`, `database`, `jwt` namespaces) loaded via `@nestjs/config` from environment variables; read elsewhere with `ConfigService.get('namespace.key')`.
- **`app.module.ts`** — wires `ConfigModule` (global) and `TypeOrmModule.forRootAsync` (Postgres connection built from `ConfigService`), then imports `UsersModule` and `AuthModule`.
- **`users/`** — `User` TypeORM entity (uuid pk, unique `username`, hashed `password`, nullable `refreshToken`, soft-delete via `deletedAt`). `UsersService` is the only place that touches the `User` repository (create/find/update/soft-delete/hard-delete). `UsersController` exposes CRUD-ish REST endpoints under `/users`; write/delete routes are gated by `AccessTokenGuard`, but `GET` routes (including by-id) are currently public.
- **`auth/`** — implements signup/signin/refresh/logout against `UsersService`:
  - `AuthService` hashes passwords/refresh tokens with `argon2`, issues an access token (15m) and refresh token (7d) signed with separate secrets (`jwt.secret` / `jwt.refresh_secret` from config), and persists the hashed refresh token on the user record for rotation/invalidation.
  - Two Passport strategies: `AccessTokenStrategy` (`'jwt'`) validates the access token; `RefreshTokenStrategy` (`'jwt-refresh'`) validates the refresh token and also attaches the raw refresh token from the `Authorization` header onto the validated payload (needed to compare against the stored hash).
  - `AccessTokenGuard` / `RefreshTokenGuard` in `common/guards/` are thin `AuthGuard()` wrappers around those two strategies — use these (not raw `AuthGuard('jwt')`) when protecting routes.
  - `IDPRequest` (in `auth/idp-request.interface.ts`) is the typed `Request` shape (`req.user`) to use in controllers after either guard runs.
- Auth endpoints (`POST /auth/signup`, `POST /auth/signin`, `GET /auth/refresh`, `GET /auth/logout`) and user endpoints (`/users`) follow standard Nest DTO validation via classes in each module's `dto/` folder (no global `ValidationPipe` is currently registered in `main.ts`).

## Conventions

- ESLint extends `@typescript-eslint/recommended` + `prettier/recommended`; `explicit-function-return-type`, `explicit-module-boundary-types`, `no-explicit-any`, and `interface-name-prefix` rules are all turned off.
- Prettier: single quotes, trailing commas everywhere (`.prettierrc`).
- Imports across modules use the `src/...` absolute-style path (e.g. `import { UsersService } from 'src/users/users.service'`) rather than relative `../../`.
