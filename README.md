# Smart Attendance

Monorepo for the Smart Attendance platform:

- `backend/` — Laravel 12 API with PostgreSQL and Sanctum
- `frontend/` — Next.js 16 application
- `compose.yaml` — Docker services for the backend API, database, and frontend

## Services and URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8001/api/v1 |
| Backend health check | http://localhost:8001/api/v1/health |
| Proxied health check through frontend | http://localhost:3000/api/v1/health |

The frontend proxies `/api/*` to the backend container, so browser requests use the same origin and do not need CORS.

## Quick Start

1. Create environment files:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

2. Review the database credentials in both files. The `DB_*` values in the root `.env` must match `backend/.env`.

3. Build and start the containers:

```bash
docker compose up -d --build
```

4. Generate the Laravel app key and prepare the database:

```bash
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate
docker compose exec app php artisan db:seed --class=AdminUserSeeder
docker compose exec app php artisan db:seed --class=DepartmentSeeder
```

5. Open the frontend:

```text
http://localhost:3000
```

The default admin credentials come from `backend/.env`:

```dotenv
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=password
```

## Repository Structure

```text
.
├── backend/
│   ├── app/                  # Laravel modules
│   ├── database/             # migrations, factories, seeders
│   ├── docker/
│   │   ├── php/Dockerfile
│   │   └── nginx/default.conf
│   ├── routes/v1/            # API route files
│   └── tests/                # backend feature tests
├── frontend/
│   ├── src/                  # Next.js source: app routes, features, components, lib
│   │   ├── app/               # App Router (thin routes and layouts)
│   │   ├── features/          # One folder per domain module
│   │   └── components/        # Layout shell, UI primitives, shared widgets
│   ├── public/
│   ├── Dockerfile
│   └── next.config.ts
├── compose.yaml
├── .env                      # Docker Compose database settings
├── FEATURES.md               # backend feature handoff
└── README.md
```

## Common Commands

| Task | Command |
|---|---|
| Start services | `docker compose up -d` |
| Stop services | `docker compose down` |
| Rebuild all services | `docker compose up -d --build` |
| View logs | `docker compose logs -f` |
| Backend tests | `docker compose exec -T app php artisan test` |
| Backend Pint check | `docker compose exec -T app ./vendor/bin/pint --test` |
| Run migrations | `docker compose exec app php artisan migrate` |
| Migration status | `docker compose exec app php artisan migrate:status` |
| Laravel shell | `docker compose exec app bash` |
| Frontend shell | `docker compose exec frontend sh` |
| PostgreSQL shell | `docker compose exec db psql -U laravel_user -d smart_attendanc` |

## Environment Files

The monorepo uses two environment files:

- `.env` at the repository root: consumed by Docker Compose for database and port settings.
- `backend/.env`: consumed by Laravel inside the backend container.

Do not commit either `.env` file. Only `.env.example` files should be committed.

To change exposed ports, update the root `.env`:

```dotenv
BACKEND_PORT=8001
FRONTEND_PORT=3000
```

## Tests

```bash
docker compose exec -T app php artisan test
docker compose exec -T app ./vendor/bin/pint --test
```

For API endpoints, business rules, and completed modules, see [FEATURES.md](FEATURES.md).
