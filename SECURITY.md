# Security and database operations

## Passwords and access

- User passwords are stored as Laravel password hashes (`User` uses the `hashed` cast); they are not stored as reversible encrypted text.
- Login is rate limited. Protected APIs enforce Sanctum authentication, roles, and teacher module permissions on the backend. Keep those checks even when hiding navigation items.
- Sanctum personal access tokens expire after seven days by default (`SANCTUM_EXPIRATION=10080` minutes). Set the environment value intentionally if deployment needs a different lifetime; revoke tokens when an account is disabled or suspected compromised.
- After deploying this token lifetime change, users with tokens older than seven days will need to sign in again.
- Set a unique random `ADMIN_PASSWORD` of at least 16 characters before seeding. Never commit `.env` files or share production secrets.
- The browser currently stores its bearer token in `localStorage`; an XSS bug could expose it. Keep dependencies patched, avoid unsafe HTML rendering, and plan migration to an HttpOnly, Secure, SameSite cookie flow for production.

## Network and firewall

Compose publishes frontend, API, and PostgreSQL ports on `127.0.0.1` by default. This prevents direct LAN exposure while keeping local development and a host Cloudflare tunnel working. To expose the website intentionally, use a TLS reverse proxy and set `HOST_BIND_IP` appropriately. Never publish PostgreSQL to the public internet.

The project cannot configure the host operating system firewall. On a Linux production host, from the machine console, first allow the SSH port you actually use, then enable the firewall and allow only web traffic:

```sh
sudo ufw allow 22/tcp       # Replace 22 if SSH uses another port.
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw enable
sudo ufw status verbose
```

Do not enable a firewall remotely without confirming the SSH allow rule first. Docker-published ports can bypass ordinary UFW filtering; keep app and database ports loopback-bound, or configure filtering in Docker's `DOCKER-USER` chain before exposing containers publicly. Never publish PostgreSQL to the internet.

Set `APP_ENV=production`, `APP_DEBUG=false`, a generated `APP_KEY`, strong database/admin secrets, and the deployed frontend origin in `CORS_ALLOWED_ORIGINS`. Use HTTPS. Do not use the local `.env.example` origins as a production allowlist.

## PostgreSQL backup and restore

Run `./scripts/backup-database.sh` from any directory. It writes a timestamped custom-format dump under `backups/` with restrictive file permissions. That directory is gitignored. Copy backups to encrypted storage on a separate host or provider and define a retention schedule; a backup only on the same disk does not protect against disk loss.

Profile avatar files are stored separately under `backend/storage/app/private/avatars/`. Include that directory in the same encrypted backup/restore process as PostgreSQL. Database backups contain only `avatar_path`; restoring the database without those files leaves profile photos unavailable.

Restore into a disposable or intentionally selected database after stopping application writes. This command replaces objects in the target database, so check the target name and keep a separate pre-restore backup:

```sh
docker compose exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-acl' < backups/your-backup.dump
```

Periodically restore a backup into a separate test database and verify that the application can read the restored data.
