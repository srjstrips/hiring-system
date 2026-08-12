# Deploying HireFlow to the VPS

This guide deploys the app alongside your other existing sites, using the
Nginx + PM2 stack already on the box, a dedicated Postgres database/user,
and no domain — accessed as `http://<VPS_IP>:<FRONTEND_PORT>`.

Run all commands below **on the VPS** over SSH, as a user with `sudo`
access. Replace every `<PLACEHOLDER>` with a real value as you go, and
keep a note of the values you pick (ports, passwords, secrets) somewhere
safe (e.g. a password manager) — you'll need them again for future
redeploys.

---

## 0. Pre-flight checks

Confirm the tools you need are already installed (they should be, since
other sites use this stack):

```bash
node -v          # need >= 20.x
npm -v
psql --version
nginx -v
pm2 -v
```

If any of these are missing, install them first (ask before doing this if
you're not sure it's safe alongside existing apps — e.g. changing the
global Node version could affect other sites).

Find two free ports — one for the frontend (public-facing) and one for
the backend (internal only, proxied by Nginx). Check what's already in
use so you don't collide with your other sites:

```bash
sudo ss -tulpn | grep LISTEN
```

Pick two ports not in that list, e.g. `8081` (frontend) and `5001`
(backend). Write them down — you'll substitute them everywhere below as
`<FRONTEND_PORT>` and `<BACKEND_PORT>`.

Also check whether `pm2 startup` has already been configured on this VPS
(so PM2-managed apps survive a reboot):

```bash
pm2 ls
systemctl status pm2-root 2>/dev/null || echo "not set up yet"
```

If it's not set up, run `pm2 startup` and follow its printed instructions
once, near the end of this guide (it only needs to be done once for the
whole VPS, not per-app).

---

## 1. Get the code onto the VPS

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/srjstrips/hiring-system.git hiring-project
sudo chown -R $USER:$USER /var/www/hiring-project
cd /var/www/hiring-project
```

(If it's already cloned, just `cd` into it and `git pull origin main`
instead for future redeploys.)

Everywhere below, `<REPO_PATH>` means `/var/www/hiring-project` (adjust if
you used a different path).

---

## 2. Database: isolated DB + user

Connect as the Postgres superuser (adjust if your existing setup uses a
different admin flow):

```bash
sudo -u postgres psql
```

Inside the `psql` prompt, create a dedicated database and user for this
app so it's fully isolated from your other sites' databases:

```sql
CREATE DATABASE hiring_db;
CREATE USER hiring_user WITH PASSWORD '<DB_PASSWORD>';
GRANT ALL PRIVILEGES ON DATABASE hiring_db TO hiring_user;
\c hiring_db
GRANT ALL ON SCHEMA public TO hiring_user;
\q
```

Pick a strong `<DB_PASSWORD>` and keep it — it goes into `backend/.env`
next.

---

## 3. Backend: configure, install, migrate, build

```bash
cd /var/www/hiring-project/backend
cp .env.production.example .env
```

Edit `.env` and fill in every placeholder:

- `PORT=<BACKEND_PORT>` (the internal port you picked in step 0)
- `DATABASE_URL="postgresql://hiring_user:<DB_PASSWORD>@localhost:5432/hiring_db?schema=public"`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET` — generate each with:

  ```bash
  openssl rand -base64 48
  ```

- `FRONTEND_URL=http://<VPS_IP>:<FRONTEND_PORT>` (the public port from step 0)
- `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` — your real mail sending credentials

Then install, generate the Prisma client, run migrations, and build:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

`prisma migrate deploy` applies all migrations under
`backend/prisma/migrations/` without prompting — safe for production, and
won't try to create a new migration.

Optional: seed initial data (only do this once, on a fresh database):

```bash
npm run db:seed
```

Start the backend under PM2:

```bash
cd /var/www/hiring-project
pm2 start deploy/ecosystem.config.cjs
pm2 save
```

Verify it's up:

```bash
pm2 status hiring-backend
pm2 logs hiring-backend --lines 50
curl -i http://127.0.0.1:<BACKEND_PORT>/health
```

This hits the built-in health check in [backend/src/app.ts](../backend/src/app.ts) (mounted at `/health`, outside the `/api/v1` prefix), which should return `{"status":"healthy",...}`.

If `pm2 startup` wasn't already configured on this VPS (checked in step
0), run it now so `hiring-backend` survives reboots:

```bash
pm2 startup
# copy/paste and run the command it prints, then:
pm2 save
```

---

## 4. Frontend: build static assets

```bash
cd /var/www/hiring-project/frontend
npm ci
npm run build
```

This produces `frontend/dist/` — a static SPA build that Nginx will serve
directly. There is no separate frontend process to run in production.

---

## 5. Nginx: wire it together

Copy the template and fill in the placeholders:

```bash
sudo cp /var/www/hiring-project/deploy/nginx-hiring.conf /etc/nginx/sites-available/hiring
sudo nano /etc/nginx/sites-available/hiring
```

Replace:

- `<FRONTEND_PORT>` -> the public port you chose (both `listen` lines)
- `<REPO_PATH>` -> `/var/www/hiring-project` (both `root` and the `/uploads/` alias)
- `<BACKEND_PORT>` -> the internal backend port

Enable the site and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/hiring /etc/nginx/sites-enabled/hiring
sudo nginx -t
sudo systemctl reload nginx
```

`nginx -t` must print "syntax is ok" / "test is successful" before you
reload — if it errors, fix the config before reloading so you don't
affect your other sites' Nginx config.

---

## 6. Firewall

If `ufw` is active, open the public frontend port:

```bash
sudo ufw status
sudo ufw allow <FRONTEND_PORT>/tcp
```

Do **not** open `<BACKEND_PORT>` — it should stay internal-only, reachable
just via Nginx's `proxy_pass` to `127.0.0.1`.

---

## 7. Verify

From your own machine (not the VPS):

```bash
curl -i http://<VPS_IP>:<FRONTEND_PORT>/
curl -i http://<VPS_IP>:<FRONTEND_PORT>/health
```

Then open `http://<VPS_IP>:<FRONTEND_PORT>` in a browser and confirm the
app loads, you can log in, and a page refresh on a deep link (e.g. a
job detail page) still works (this confirms the Nginx SPA fallback is
correct).

---

## 8. Redeploying later

For subsequent updates, from `/var/www/hiring-project`:

```bash
git pull origin main

cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart hiring-backend

cd ../frontend
npm ci
npm run build   # Nginx picks up the new dist/ automatically, no reload needed
```

Do **not** delete `backend/uploads/` or run `db:reset` during a redeploy —
`uploads/` holds resumes/files users have submitted, and `db:reset` wipes
the database.

---

## 9. Adding a real domain + SSL later (optional, not needed now)

When you're ready to move off `IP:PORT`:

1. Point a DNS `A` record for your chosen subdomain (e.g.
   `hiring.yourdomain.com`) at the VPS IP.
2. In `/etc/nginx/sites-available/hiring`, change `listen <FRONTEND_PORT>;`
   to `listen 80;` and set `server_name hiring.yourdomain.com;`.
3. Run `sudo certbot --nginx -d hiring.yourdomain.com` (assuming certbot is
   already installed for your other sites) to get a free TLS cert and have
   it auto-configure the HTTPS server block.
4. Update `FRONTEND_URL` in `backend/.env` to
   `https://hiring.yourdomain.com`, then `pm2 restart hiring-backend`.

This is a config-only change — no re-architecture needed, since the app
was already built to sit behind Nginx as a reverse proxy.
