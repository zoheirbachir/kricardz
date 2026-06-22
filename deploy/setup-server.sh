#!/usr/bin/env bash
# One-shot KriCar deploy for a fresh Ubuntu 22.04/24.04 Hostinger VPS.
#
# Put the project at /var/www/kricar (so Nginx can read the build), then run:
#   sudo bash deploy/setup-server.sh                 # IP-only, HTTP
#   sudo bash deploy/setup-server.sh your-domain.com # + Nginx server_name + HTTPS
#
# Safe to re-run (idempotent): it rebuilds, restarts PM2, and reloads Nginx.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

DOMAIN="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
echo "==> Project root: $ROOT"

if [ "$(id -u)" -ne 0 ]; then echo "Run with sudo/root."; exit 1; fi

echo "==> [1/7] System packages"
apt-get update -y
apt-get install -y curl ca-certificates openssl nginx

echo "==> [2/7] Node 24 (node:sqlite needs >=22.5)"
NODE_MAJOR=0
command -v node >/dev/null 2>&1 && NODE_MAJOR="$(node -v | sed 's/v//' | cut -d. -f1)"
if [ "$NODE_MAJOR" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
echo "    node $(node -v)"
command -v pm2 >/dev/null 2>&1 || npm install -g pm2

echo "==> [3/7] Build frontend"
npm --prefix "$ROOT/frontend" install
npm --prefix "$ROOT/frontend" run build

echo "==> [4/7] Install backend + .env"
npm --prefix "$ROOT/backend" install
ENV_FILE="$ROOT/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  ORIGIN="*"; [ -n "$DOMAIN" ] && ORIGIN="https://$DOMAIN,https://www.$DOMAIN"
  cat > "$ENV_FILE" <<EOF
PORT=5000
NODE_ENV=production
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=$ORIGIN
EOF
  echo "    wrote $ENV_FILE (generated JWT_SECRET)"
else
  echo "    $ENV_FILE already exists — leaving it"
fi

echo "==> [5/7] Start API with PM2"
cd "$ROOT"
pm2 start ecosystem.config.js 2>/dev/null || pm2 restart kricar-api
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

echo "==> [6/7] Nginx"
WWW=""; [ -n "$DOMAIN" ] && WWW="www.$DOMAIN"
cat > /etc/nginx/sites-available/kricar <<EOF
server {
    listen 80;
    server_name ${DOMAIN:-_} $WWW;
    root $ROOT/frontend/dist;
    index index.html;
    client_max_body_size 12M;
    location /api/       { proxy_pass http://127.0.0.1:5000; proxy_http_version 1.1; proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; }
    location /uploads/   { proxy_pass http://127.0.0.1:5000; proxy_set_header Host \$host; }
    location /socket.io/ { proxy_pass http://127.0.0.1:5000; proxy_http_version 1.1; proxy_set_header Upgrade \$http_upgrade; proxy_set_header Connection "upgrade"; proxy_set_header Host \$host; proxy_read_timeout 86400; }
    location /           { try_files \$uri \$uri/ /index.html; }
}
EOF
ln -sf /etc/nginx/sites-available/kricar /etc/nginx/sites-enabled/kricar
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> [7/7] Firewall + HTTPS"
if command -v ufw >/dev/null 2>&1; then ufw allow OpenSSH >/dev/null 2>&1 || true; ufw allow 'Nginx Full' >/dev/null 2>&1 || true; yes | ufw enable >/dev/null 2>&1 || true; fi
if [ -n "$DOMAIN" ]; then
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" --redirect \
    || echo "    !! Certbot failed — usually means DNS isn't pointed at this server yet. Re-run this script after DNS propagates."
fi

echo ""
echo "============================================================"
echo " DONE.  Open:  ${DOMAIN:+https://$DOMAIN}${DOMAIN:-http://<your-server-ip>}"
echo " Logs:   pm2 logs kricar-api      Status: pm2 status"
echo "============================================================"
