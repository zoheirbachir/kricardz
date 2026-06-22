# Deploying KriCar to Hostinger

KriCar is a **Node.js app**, not a static/PHP site:

- **Backend** — Express + `node:sqlite` (Node's built-in SQLite) + Socket.io (WebSockets) + file uploads written to disk.
- **Frontend** — a Vite/React SPA built to static files that talks to `/api`, `/uploads`, `/socket.io` on the same origin.

### What this requires
| Need | Why |
|------|-----|
| A **persistent Node process** | Express + Socket.io must stay running. |
| **Node ≥ 22.5 (use 24 LTS)** | `node:sqlite` doesn't exist on older Node. |
| **WebSockets + a real filesystem** | Socket.io, the SQLite DB file, and uploads. |

➡️ On Hostinger this means a **VPS (KVM plan)**. The shared "web hosting" plans (Premium/Business) **cannot** run this — they're PHP/static only and kill long-running processes. The cheapest **KVM 1** VPS is enough to start.

> If you only have shared hosting, jump to [Option B](#option-b--shared-hosting--external-backend) at the bottom.

---

## Option A — Hostinger VPS (recommended)

Assumes an **Ubuntu 22.04/24.04** KVM VPS. SSH in as root (Hostinger shows the IP + password in hPanel → VPS).

```bash
ssh root@YOUR_VPS_IP
```

### 1. Install Node 24, PM2, Nginx

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
node -v          # must print v24.x
sudo npm install -g pm2
```

### 2. Get the code onto the server

**Either** push this project to GitHub and clone it:
```bash
sudo mkdir -p /var/www && cd /var/www
git clone https://github.com/YOU/kricar.git kricar
```
**Or** upload it from your PC (run this locally, not on the server — exclude node_modules):
```powershell
# from C:\Users\am\Documents\kricar-clone on your machine
tar --exclude=node_modules --exclude=frontend/dist --exclude=backend/db/*.db -czf kricar.tgz .
scp kricar.tgz root@YOUR_VPS_IP:/var/www/
```
then on the server: `cd /var/www && mkdir kricar && tar -xzf kricar.tgz -C kricar`

### 3. Build the frontend & install the backend

```bash
cd /var/www/kricar
npm --prefix frontend install
npm --prefix frontend run build      # creates frontend/dist
cd backend && npm install
```

### 4. Configure secrets

```bash
cd /var/www/kricar/backend
cp .env.example .env
nano .env
```
Set at minimum:
- `JWT_SECRET` → run `openssl rand -hex 32` and paste the output
- `CORS_ORIGIN=https://your-domain.com` (or leave `*` if same-origin)
- keep `PORT=5000`, `NODE_ENV=production`

### 5. (Optional) seed demo data & create an admin

```bash
cd /var/www/kricar/backend
npm run seed     # OPTIONAL — loads the demo cars/agencies (wipes existing cars!)
```
Promote a user to admin (register them in the UI first, then):
```bash
node -e "require('./db/database').prepare('UPDATE users SET is_admin=1 WHERE email=?').run('you@example.com')"
```

### 6. Start with PM2

```bash
cd /var/www/kricar
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd        # run the command it prints, so it survives reboots
pm2 logs kricar-api        # check it's up: "running on port 5000"
```

### 7. Nginx reverse proxy

```bash
sudo cp /var/www/kricar/deploy/nginx.conf.example /etc/nginx/sites-available/kricar
sudo nano /etc/nginx/sites-available/kricar   # replace YOUR_DOMAIN + confirm root path
sudo ln -s /etc/nginx/sites-available/kricar /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```
At this point the site is reachable at **http://YOUR_VPS_IP**.

### 8. Point your domain + enable HTTPS

In **Hostinger hPanel → Domains → DNS** (or your registrar), add:
```
A    @     YOUR_VPS_IP
A    www   YOUR_VPS_IP
```
Wait for DNS to propagate, then:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```
Certbot adds the TLS config and auto-renews. Site is now **https://your-domain.com**.

### 9. Firewall (only expose 80/443)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```
Do **not** open port 5000 — only Nginx talks to Node.

---

## Updating after a code change

```bash
cd /var/www/kricar
git pull                                   # or re-upload
npm --prefix frontend install
npm --prefix frontend run build
cd backend && npm install
pm2 restart kricar-api
```

## Backups
The whole app state is two things — back them up periodically:
- `backend/db/kricar.db` (the database)
- `backend/uploads/` (KYC + car photos)

---

## Option B — shared hosting + external backend

If you're stuck on Hostinger **web hosting** (no VPS), split it:

1. **Frontend on Hostinger:** build locally with the backend URL baked in, then upload `frontend/dist/*` to `public_html` via hPanel File Manager.
   ```bash
   # locally
   echo "VITE_SOCKET_URL=https://your-api-host.com" > frontend/.env.production
   # also point the API at the remote backend — set axios baseURL to that host,
   # or add an hPanel redirect/proxy. (Same-origin is simpler; that's why a VPS wins.)
   npm --prefix frontend run build
   ```
   Add a `.htaccess` in `public_html` for SPA routing:
   ```apache
   RewriteEngine On
   RewriteBase /
   RewriteRule ^index\.html$ - [L]
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /index.html [L]
   ```
2. **Backend on a Node host** (Render / Railway / Fly.io free tier): deploy the `backend/` folder, set `JWT_SECRET` + `CORS_ORIGIN=https://your-hostinger-domain`. Note many free hosts have **ephemeral disks** — your SQLite DB and uploads can be wiped on redeploy, so attach a persistent volume or move to Postgres/S3 for anything real.

This works but is more moving parts and cross-origin config. A single small VPS (Option A) is cleaner for this stack.
