#!/bin/bash
# Deploy script for Glass Eyewear
# Usage: bash deploy.sh

set -e

echo "=== GLASS DEPLOY ==="

cd /www/wwwroot/glass.cuongdesign.net

echo "[1/5] Pull code..."
git pull origin main

echo "[2/5] Backend..."
cd backend
php artisan migrate --force 2>/dev/null || true
php artisan config:clear
php artisan config:cache
php artisan route:cache
cd ..

echo "[3/5] Build frontend..."
rm -rf .next
npm install --production=false
npm run build

echo "[4/5] Restart PM2..."
pm2 delete glass 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
sleep 2
pm2 start "npx next start -p 3222" --name glass
sleep 3

echo "[5/5] Reload Nginx..."
nginx -s reload

echo ""
echo "=== DEPLOY DONE ==="
echo "Test: curl -s http://127.0.0.1:3222/ | head -c 200"
