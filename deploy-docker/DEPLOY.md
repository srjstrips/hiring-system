# Deploying HireFlow to the VPS with Docker Compose

This deploys the app as its own isolated Docker Compose stack, matching how
the other apps on this VPS already run (`hrms`, `ssfb-marketing-app`,
`strips-canteen-app`, etc.) — no PM2, no shared Nginx/Postgres. Only one
port (`3005`) is published publicly; the backend and its Postgres database
stay internal to the stack's own Docker network.

Run all commands below **on the VPS** over SSH. Replace every
`<PLACEHOLDER>` with a real value. Keep a note of the values you pick
(passwords, secrets) somewhere safe — you'll need them again for backups
and future redeploys.

---

## 0. Pre-flight checks

Docker and Docker Compose should already be present (other apps use them):

```bash
docker -v
docker compose version
```

Confirm port `3005` is free (it should be, based on the `docker ps -a`
output showing `3000, 3002, 3004, 4000, 4001, 5433, 6379, 3306` in use):

```bash
sudo ss -tulpn | grep LISTEN
```

If `3005` is somehow taken, pick another free port and use it everywhere
below instead (the `ports:` line in `docker-compose.yml`, and
`FRONTEND_URL` in `.env`).

---

## 1. Get the code onto the VPS

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/srjstrips/hiring-system.git hiring-project
sudo chown -R $USER:$USER /var/www/hiring-project
cd /var/www/hiring-project
```

(If already cloned, just `cd` in and `git pull origin main` instead.)

---

## 2. Configure environment

```bash
cp .env.docker.example .env
nano .env
```

Fill in:

- `POSTGRES_PASSWORD` — generate with `openssl rand -base64 48`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET` — generate each separately with `openssl rand -base64 48`
- `FRONTEND_URL=http://<VPS_IP>:3005` — must exactly match how you'll access the app in a browser (backend CORS is locked to this single origin, see `backend/src/app.ts`)
- `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` — real production email credentials

Leave `POSTGRES_USER`/`POSTGRES_DB` as `hiring_user`/`hiring_db` unless you
have a reason to change them.

---

## 3. Build and start the stack

```bash
docker compose build
docker compose up -d
```

This builds three images (`postgres`, `backend`, `web`) and starts them on
their own `hiring_net` Docker network. The `backend` container's startup
command automatically runs `npx prisma migrate deploy` before starting the
server, so the database schema is created/updated on first boot with no
manual migration step.

Watch it come up:

```bash
docker compose ps
docker compose logs -f backend
```

Look for the backend log line confirming the server started, then Ctrl+C
out of `logs -f`.

---

## 4. Verify

```bash
curl -i http://127.0.0.1:3005/health
```

From your own machine (not the VPS):

```bash
curl -i http://<VPS_IP>:3005/health
```

Then open `http://<VPS_IP>:3005` in a browser, confirm you can log in, and
that refreshing a deep-linked page (e.g. a job detail page) still works
(confirms the Nginx SPA fallback in `frontend/nginx.conf` is working).

---

## 5. Firewall

If `ufw` is active:

```bash
sudo ufw status
sudo ufw allow 3005/tcp
```

Do **not** open any port for `postgres` or `backend` — they're only meant
to be reachable from inside the `hiring_net` Docker network.

---

## 6. Optional: seed initial data

Only do this once, on a fresh database:

```bash
docker compose exec backend npm run db:seed
```

---

## 7. Redeploying later

From `/var/www/hiring-project`:

```bash
git pull origin main
docker compose build
docker compose up -d
```

Migrations re-apply automatically on container start (`prisma migrate
deploy` is idempotent — it only applies migrations that haven't run yet).

Do **not** run `docker compose down -v` — the `-v` flag deletes the named
volumes (`hiring_pg_data`, `hiring_uploads`), wiping the database and all
uploaded resumes. Plain `docker compose down` (or just `up -d` again for
updates) is safe and preserves volumes.

---

## 8. Backup and restore

**Database backup:**

```bash
docker compose exec -T postgres pg_dump -U hiring_user hiring_db > backup_$(date +%Y%m%d).sql
```

**Database restore** (into a running `postgres` container):

```bash
cat backup_YYYYMMDD.sql | docker compose exec -T postgres psql -U hiring_user -d hiring_db
```

**Uploads backup** (resumes etc., stored in the `hiring_uploads` named volume):

```bash
docker run --rm -v hiring_hiring_uploads:/data -v $(pwd):/backup alpine \
  tar czf /backup/uploads_backup_$(date +%Y%m%d).tar.gz -C /data .
```

(The volume name is prefixed with the compose project name `hiring`, so it
shows up as `hiring_hiring_uploads` — confirm the exact name with
`docker volume ls` if this doesn't match.)

---

## 9. Useful day-to-day commands

```bash
docker compose ps                     # status of all 3 services
docker compose logs -f backend        # tail backend logs
docker compose logs -f web            # tail nginx/frontend logs
docker compose restart backend        # restart just the backend
docker compose exec backend sh        # shell into the backend container
```

---

## 10. Adding a real domain + SSL later (optional, not needed now)

Since only the `web` container is exposed, moving to a domain later just
means adding an Nginx reverse-proxy on the host (or another container) in
front of port `3005` and pointing DNS + certbot at it — no change needed
inside this stack itself. Update `FRONTEND_URL` in `.env` to the new
`https://` URL and run `docker compose up -d` to pick it up.
