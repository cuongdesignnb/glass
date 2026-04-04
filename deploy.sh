#!/bin/bash
# ============================================
# Glass Eyewear — Deploy Script
# Chạy: bash deploy.sh
# ============================================

set -e

echo "🚀 Bắt đầu deploy Glass Eyewear..."

# 1. Pull code mới
echo "📥 Pull code từ Git..."
git fetch origin && git reset --hard origin/main

# 2. Backend: migrate + clear ALL cache
echo "🔧 Backend: migrate + clear cache..."
cd backend
php artisan migrate --force
php artisan route:clear
php artisan config:clear
php artisan cache:clear 2>/dev/null || true
php artisan view:clear
cd ..

# 3. Frontend: rebuild
echo "🏗️ Frontend: rebuild Next.js..."
rm -rf .next
npm run build

# 4. Restart PM2
echo "♻️ Restart PM2..."
pm2 restart glass

echo ""
echo "✅ Deploy hoàn tất!"
echo "🌐 Website: https://glass.cuongdesign.net"
