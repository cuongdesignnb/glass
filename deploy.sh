#!/bin/bash
# ============================================
# Glass Eyewear — Deploy Script
# Chạy: bash deploy.sh
# ============================================

set -e

echo "🚀 Bắt đầu deploy Glass Eyewear..."

# 1. Pull code mới
echo "📥 Pull code từ Git..."
git pull origin main

# 2. Backend: migrate
echo "🔧 Backend: chạy migrate..."
php backend/artisan migrate --force

# 3. Frontend: rebuild
echo "🏗️ Frontend: build Next.js..."
npm run build

# 4. Restart PM2
echo "♻️ Restart PM2..."
pm2 restart glass

# 5. Xóa Nginx proxy cache và reload Nginx
echo "🧹 Xóa Nginx cache & reload..."
rm -rf /www/server/nginx/proxy_cache_dir/*
nginx -s reload

echo ""
echo "✅ Deploy hoàn tất!"
echo "🌐 Website: https://mitoo.vn"
