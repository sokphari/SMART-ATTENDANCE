# Smart Attendance System – Docker Setup Guide

This guide explains how to set up the Laravel 12 project with Docker, Nginx, PHP 8.3, and PostgreSQL on Windows and Linux.

## 1. Requirements

| Windows | Linux (Ubuntu/Zorin) |
|---|---|
| Docker Desktop | Docker Engine |
| WSL2 (for Docker Desktop) | Docker Compose Plugin |
| Git for Windows | Git |
| VS Code | VS Code |

**Note:** You do not need to install PHP, Composer, or PostgreSQL locally. These are provided by the Docker containers.

---

## 2. Windows Setup (PowerShell)

Open **PowerShell** or the VS Code PowerShell terminal.

### Step 1: Verify Docker

Make sure Docker Desktop is running.

```powershell
docker --version
docker compose version
```

### Step 2: Clone the project

```powershell
git clone <YOUR_REPOSITORY_URL>
cd laravel-docker
```

### Step 3: Create environment file

```powershell
Copy-Item .env.example .env
```

Open the environment file:

```powershell
code .env
```

Configure PostgreSQL:

```dotenv
DB_CONNECTION=pgsql
DB_HOST=db
DB_PORT=5432
DB_DATABASE=smart_attendanc
DB_USERNAME=laravel_user
DB_PASSWORD=your_local_database_password
```

Replace the example password with your own strong local password.

### Step 4: Build Docker containers

```powershell
docker compose up -d --build
```

Check containers:

```powershell
docker compose ps
```

### Step 5: Install Laravel dependencies

```powershell
docker compose exec app composer install
```

### Step 6: Generate application key

```powershell
docker compose exec app php artisan key:generate
```

### Step 7: Run migrations

```powershell
docker compose exec app php artisan config:clear
docker compose exec app php artisan migrate
```

### Step 8: Verify database

```powershell
docker compose exec app php artisan db:show
```

### Step 9: Open project

http://localhost:8000

---

## 3. Linux Setup (Ubuntu / Zorin OS)

Open your Linux terminal.

### Step 1: Verify Docker

```bash
docker --version
docker compose version
```

Make sure the Docker service is running:

```bash
sudo systemctl start docker
```

If Docker requires administrator permissions, use `sudo docker compose` or configure Docker's user permissions correctly.

### Step 2: Clone the project

```bash
git clone <YOUR_REPOSITORY_URL>
cd laravel-docker
```

### Step 3: Create environment file

```bash
cp .env.example .env
```

Open `.env`:

```bash
nano .env
```

Configure PostgreSQL:

```dotenv
DB_CONNECTION=pgsql
DB_HOST=db
DB_PORT=5432
DB_DATABASE=smart_attendanc
DB_USERNAME=laravel_user
DB_PASSWORD=your_local_database_password
```

Save in Nano using `Ctrl + O`, Enter, then `Ctrl + X`.

### Step 4: Build Docker containers

```bash
docker compose up -d --build
```

Check containers:

```bash
docker compose ps
```

### Step 5: Install Laravel dependencies

```bash
docker compose exec app composer install
```

### Step 6: Generate application key

```bash
docker compose exec app php artisan key:generate
```

### Step 7: Run migrations

```bash
docker compose exec app php artisan config:clear
docker compose exec app php artisan migrate
```

### Step 8: Verify database

```bash
docker compose exec app php artisan db:show
```

### Step 9: Open project

http://localhost:8000

---

## 4. Daily Development Commands (Windows and Linux)

These commands work on both operating systems, provided Docker Compose is installed and accessible.

| Task | Command |
|---|---|
| Start Docker services | `docker compose up -d` |
| Stop Docker services | `docker compose down` |
| Restart services | `docker compose restart` |
| Rebuild application | `docker compose up -d --build` |
| Check containers | `docker compose ps` |
| View logs | `docker compose logs -f` |
| Run migrations | `docker compose exec app php artisan migrate` |
| Migration status | `docker compose exec app php artisan migrate:status` |
| Run seeders | `docker compose exec app php artisan db:seed` |
| Run Laravel tests | `docker compose exec app php artisan test` |
| Open PHP shell | `docker compose exec app bash` |

## 5. PostgreSQL Commands (Both Operating Systems)

Connect to PostgreSQL:

```bash
docker compose exec db psql -U laravel_user -d smart_attendanc
```

Inside PostgreSQL:

```sql
-- List all tables
\dt

-- List all databases
\l

-- List all roles
\du

-- Exit PostgreSQL
\q
```

PostgreSQL automatically creates the configured database during its first initialization with an empty Docker data volume.

**Important:** If the volume already exists, changing the `POSTGRES_USER` or `POSTGRES_DB` environment variables will not recreate the user or database.

## 6. Troubleshooting

### Docker permission denied (Linux)

Check that your user has permission to access Docker. If using Docker Engine, you can configure access with:

```bash
sudo usermod -aG docker $USER
```

Log out and log in again for the group membership to apply.

Note: Membership in the Docker group grants root-equivalent privileges on the host.

### PostgreSQL connection refused

Verify the database container:

```bash
docker compose ps
docker compose logs db
```

Make sure Laravel's `.env` contains `DB_HOST=db` when running inside Docker.

### Port 8000 already in use

Change the Nginx port mapping in `compose.yaml`:

```yaml
ports:
  - "8001:80"
```

Then run:

```bash
docker compose up -d
```

Open http://localhost:8001.

### Docker data safety

Do not use:

```bash
docker compose down -v
```

unless you intentionally want to delete the project's persistent Docker volumes, including PostgreSQL data.

---

## 7. Git Workflow

These commands work on Windows PowerShell and Linux.

```bash
# Get latest changes
git pull origin main

# Create feature branch
git switch -c feature/attendance

# Stage changes
git add .

# Commit changes
git commit -m "feat: implement attendance module"

# Push feature branch
git push -u origin feature/attendance
```

Create a Pull Request to merge your changes into the main branch.

## 8. Before Pushing Code

Make sure the following project files are committed:

- `compose.yaml`
- `docker/php/Dockerfile`
- `docker/nginx/default.conf`
- `.dockerignore`
- `.env.example`
- `composer.json`
- `composer.lock`
- `README.md`
- Laravel source code and migrations

Do not commit `.env`, actual database passwords, or database volumes.

---

**Project:** Smart Attendance System  
**Framework:** Laravel 12  
**Database:** PostgreSQL  
**Containerization:** Docker Compose  
**Supported Development OS:** Windows / Linux