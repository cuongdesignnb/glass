# Production deploy: PR1, PR2A và PR3

> Tài liệu này là hồ sơ lịch sử cho release PR1/PR2A/PR3. Với các release mới, dùng quy trình một lệnh có SHA pinning, backup và rollback trong [`safe-production-deploy.md`](./safe-production-deploy.md).

Tài liệu này là runbook cho lần triển khai kế tiếp. Không có lệnh production nào được thực thi khi tài liệu được tạo.

## Source

- Repository: `cuongdesignnb/glass`
- Branch: `main`
- Expected application deploy SHA: `5a774c844d22e7958ab252f77db192ede7ec00ba`
- Production path: `/www/wwwroot/kinhmathongnhung.vn`
- PM2 application: `glass`
- Next.js port: `3222`
- PHP-FPM socket được nginx tham chiếu: `/tmp/php-cgi-82.sock`
- Public domain: `https://mitoo.vn`

Các thay đổi đã tích hợp:

- PR #1, performance baseline và quick wins: merge SHA `deb8ff1898c4f3d623ade227358961177bf20480`.
- PR #2, SSR/LCP/CLS/listing: nội dung được tích hợp tại `c79f7357338048528f310ff7faa65bd7976dd0b5`; PR được hoàn tất trên GitHub tại `20b79219c1a6d226eb0585fe77bd20b38e364f92`.
- PR #3, dynamic collections và Collection API hardening: merge SHA `5a774c844d22e7958ab252f77db192ede7ec00ba`.

## Release gate

Không chạy `bash deploy.sh` hiện tại một cách trực tiếp cho release này trước khi kiểm tra các điểm sau. Script hiện tại dùng `git pull origin main`, tự chạy `php backend/artisan migrate --force`, không pin expected SHA và không chạy `composer install`/`npm ci`. Runbook bên dưới thay thế các bước đó bằng quy trình có kiểm soát.

Nếu vẫn muốn giữ trải nghiệm một lệnh `bash deploy.sh`, hãy cập nhật script ở một task riêng theo đúng các gate trong tài liệu này và review trước khi chạy production.

## Preflight

### 1. Ghi nhận trạng thái hiện tại

```bash
cd /www/wwwroot/kinhmathongnhung.vn

git status --short
git branch --show-current
git rev-parse HEAD
git remote -v
df -h
node --version
npm --version
php --version
composer --version
pm2 describe glass
test -S /tmp/php-cgi-82.sock
nginx -t
```

Yêu cầu:

- Branch đang là `main`.
- Worktree sạch. Nếu có thay đổi local, dừng và xử lý riêng; không để `git reset --hard` ghi đè dữ liệu chưa backup.
- Node phải hỗ trợ test TypeScript native; CI của release dùng Node 24.
- PHP phải là 8.2 trở lên.
- PM2 app `glass`, PHP-FPM socket và nginx đều hoạt động.
- Dung lượng đĩa đủ cho `node_modules`, Composer vendor và `.next` mới.

### 2. Backup

- Backup database bằng cơ chế backup của aaPanel hoặc lệnh `mysqldump` đã được quản trị viên kiểm chứng. Không ghi mật khẩu database trực tiếp vào shell history.
- Ghi lại SHA hiện tại làm `PREVIOUS_SHA`.
- Backup các file môi trường production ngoài Git: `.env`, `backend/.env` và cấu hình liên quan.
- Xác nhận có thể phục hồi backup trước khi tiếp tục.

Ví dụ ghi nhận SHA:

```bash
cd /www/wwwroot/kinhmathongnhung.vn
PREVIOUS_SHA="$(git rev-parse HEAD)"
printf '%s\n' "$PREVIOUS_SHA"
```

## Migration

No new database migration expected.

PR #3 chỉ sửa một migration cũ để test SQLite chạy được; migration này đã tồn tại từ trước và không tạo migration production mới. Trước khi deploy, chỉ kiểm tra trạng thái:

```bash
cd /www/wwwroot/kinhmathongnhung.vn
php backend/artisan migrate:status
```

Nếu xuất hiện migration `Pending` ngoài dự kiến, dừng deploy để điều tra. Không chạy `php backend/artisan migrate --force` trong release này nếu chưa xác minh rõ migration pending.

## Deploy

Các lệnh dưới đây chỉ chạy sau khi backup và preflight đạt yêu cầu:

```bash
cd /www/wwwroot/kinhmathongnhung.vn

EXPECTED_SHA="5a774c844d22e7958ab252f77db192ede7ec00ba"
PREVIOUS_SHA="$(git rev-parse HEAD)"

git fetch origin main
git switch main
git cat-file -e "${EXPECTED_SHA}^{commit}"
git reset --hard "$EXPECTED_SHA"
test "$(git rev-parse HEAD)" = "$EXPECTED_SHA"

composer install --working-dir=backend --no-dev --no-interaction --prefer-dist --optimize-autoloader
npm ci --no-audit --no-fund
npm run build

php backend/artisan optimize:clear
php backend/artisan config:cache
php backend/artisan view:cache

pm2 restart glass
pm2 describe glass
```

Lưu ý vận hành:

- Không chạy `php artisan route:cache`: `backend/routes/api.php` hiện có closure routes.
- Release này không đổi nginx config, vì vậy không cần reload nginx nếu `nginx -t` đã pass và config không bị sửa ngoài Git.
- Backend có thay đổi PHP. Nếu production bật OPcache không tự kiểm tra timestamp, reload PHP-FPM 8.2 bằng đúng cơ chế đã được aaPanel/server xác minh. Không đoán tên systemd service.
- Không xóa toàn bộ nginx proxy cache trừ khi có bằng chứng cache cũ gây sai nội dung.

## Smoke test

Kiểm tra HTTP và UI ngay sau restart:

- `/`
- `/san-pham`
- Một trang `/san-pham/<active-slug>`
- `/bai-viet`
- Một trang `/bai-viet/<published-slug>`
- `/bo-suu-tap`
- `/bo-suu-tap/<active-collection-slug>`
- `GET /api/public/collections?all=1` không trả collection inactive.
- Một inactive collection slug trả HTTP 404. Nếu production không có fixture inactive đã biết, không tự thay đổi dữ liệu chỉ để test.
- `/sitemap.xml` chứa URL collection active và không chứa collection inactive.
- Homepage hiển thị collection do Admin quản lý, không dùng nội dung collection hardcode cũ.
- Admin Collections: index, tạo thử, sửa, reorder và xóa bản ghi test theo quy trình dữ liệu đã được phê duyệt.
- Zalo chỉ tải sau tương tác và mở đúng intent.
- Cart thêm/xóa/cập nhật sản phẩm bình thường, gồm khác màu/add-on.
- Newsletter submit thành công và không hiển thị trùng slot ở homepage.

Kiểm tra nhanh bằng CLI:

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' https://mitoo.vn/
curl -fsS -o /dev/null -w '%{http_code}\n' https://mitoo.vn/san-pham
curl -fsS -o /dev/null -w '%{http_code}\n' https://mitoo.vn/bai-viet
curl -fsS -o /dev/null -w '%{http_code}\n' https://mitoo.vn/bo-suu-tap
curl -fsS https://mitoo.vn/api/public/collections
curl -fsS -o /dev/null -w '%{http_code}\n' https://mitoo.vn/sitemap.xml
pm2 logs glass --lines 100 --nostream
```

## Rollback

Rollback source không cần rollback database vì release không có migration mới dự kiến.

```bash
cd /www/wwwroot/kinhmathongnhung.vn

test -n "$PREVIOUS_SHA"
git cat-file -e "${PREVIOUS_SHA}^{commit}"
git reset --hard "$PREVIOUS_SHA"

composer install --working-dir=backend --no-dev --no-interaction --prefer-dist --optimize-autoloader
npm ci --no-audit --no-fund
npm run build

php backend/artisan optimize:clear
php backend/artisan config:cache
php backend/artisan view:cache

pm2 restart glass
pm2 describe glass
```

Sau rollback, lặp lại smoke test và kiểm tra log. Không chạy `migrate:rollback` trừ khi đã xác nhận một migration ngoài dự kiến thực sự được thực thi; trong trường hợp đó phải đánh giá riêng dữ liệu và backup trước.

## Post-deploy performance

Đo sau khi production ổn định, cùng thiết bị/mạng/profile và ít nhất ba lượt cho mỗi trang:

- Home mobile Lighthouse.
- Product listing.
- Product detail.
- Article listing.
- Article detail.

Lưu lại median LCP, CLS, INP/TBT, performance score, thời điểm đo và SHA đang chạy. Không kết luận production nhanh hơn trước khi so sánh với baseline trong `docs/audits/` bằng cùng điều kiện đo.

## Deployment status

`PRODUCTION_DEPLOYED=NO`
