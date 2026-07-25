# MITOO safe production deployment

Runbook này áp dụng cho MITOO tại `/www/wwwroot/kinhmathongnhung.vn`. Quy trình yêu cầu một commit SHA đầy đủ, build trong worktree staging riêng và chỉ dừng PM2 `glass` sau khi toàn bộ preflight, backup, build, test và migration gate đã đạt.

## Điều kiện trước khi chạy

- Chạy bằng `root` tại đúng production root.
- Branch hiện tại là `main`, remote `origin` là `cuongdesignnb/glass`.
- SHA được duyệt phải là SHA 40 ký tự và mặc định phải bằng `origin/main` sau `git fetch origin main`.
- PHP 8.2, socket `/tmp/php-cgi-82.sock`, PM2 app `glass`, Next.js port `3222`, Nginx và MySQL phải đang healthy.
- Không chạy hai deployment đồng thời. Script khóa `/var/lock/mitoo-deploy.lock` bằng `flock`.

Không dán password, API key hoặc nội dung file `.env` vào terminal, ticket hay tài liệu vận hành.

## Standard deploy

```bash
cd /www/wwwroot/kinhmathongnhung.vn
DEPLOY_SHA="<full-40-character-sha>" bash deploy.sh
```

Thiếu `DEPLOY_SHA`, SHA rút gọn, SHA nằm ngoài lịch sử `origin/main` hoặc SHA không bằng head hiện tại của `origin/main` đều bị chặn trước khi production thay đổi.

## Check only

Nên chạy trước mọi release:

```bash
cd /www/wwwroot/kinhmathongnhung.vn
DEPLOY_SHA="<full-40-character-sha>" CHECK_ONLY=1 bash deploy.sh
```

Chế độ này kiểm tra lock, SHA, worktree, disk, runtime, Nginx, PHP-FPM, PM2, Next.js local health, kết nối database, migration status, MySQL thresholds và Laravel API hiện tại. Nó không build, không cài dependency, không stop/restart service, không chạy migration và không reset source. Kết quả thành công kết thúc bằng:

```text
CHECK_ONLY=PASS
PRODUCTION_CHANGED=NO
```

## Release có migration đã được duyệt

Chỉ dùng sau khi migration đã được review và có kế hoạch database recovery riêng:

```bash
cd /www/wwwroot/kinhmathongnhung.vn
DEPLOY_SHA="<full-40-character-sha>" ALLOW_MIGRATIONS=1 bash deploy.sh
```

Nếu release có pending migration mà thiếu `ALLOW_MIGRATIONS=1`, script dừng với `MIGRATION_STATUS=BLOCKED_PENDING`. Khi được duyệt, `migrate --force` chỉ chạy sau khi database dump, `gzip -t` và checksum đều đạt. Database rollback không tự động; nếu activation thất bại sau khi migration bắt đầu, kết quả ghi `DATABASE_ROLLBACK=NOT_AUTOMATIC` và cần DBA/developer review bản dump cùng migration đã chạy.

## Luồng release

1. Giữ deployment lock và xác minh root, branch, remote, SHA.
2. Phân loại tracked changes theo allowlist; chặn thay đổi ngoài allowlist và chặn untracked file xung đột với commit đích.
3. Chạy runtime, disk, Nginx, PM2, PHP-FPM, API JSON và MySQL safety gates.
4. Tạo release record, sao lưu environment, tracked production data và database.
5. Tạo detached worktree tại `/www/releases/mitoo-*` và copy environment có kiểm soát.
6. Chạy Composer dev install, Laravel tests, Composer production install không dev package, dọn stale manifests và kiểm tra Laravel boot bằng user `www`.
7. Chạy npm clean install, performance tests, TypeScript, ESLint và Next.js production build.
8. Kiểm tra pending migration và chỉ chạy khi được duyệt.
9. Tạo backup branch, stop đúng PM2 app `glass`, chuyển runtime cũ sang rollback directory, reset source tới pinned SHA và chuyển runtime mới vào.
10. Chuẩn hóa permission, rebuild Laravel cache, reload PHP-FPM 8.2, restart `glass`, chạy smoke tests rồi `pm2 save`.

## Release records

Mỗi deployment thật tạo record:

```text
/www/backup/mitoo-release-YYYYMMDD-HHMMSS/
```

Staging và rollback runtime nằm dưới:

```text
/www/releases/mitoo-*
```

Các file quan trọng gồm `previous-sha.txt`, `deploy-sha.txt`, `git-status-before.txt`, `tracked-diff-stat.txt`, `database-before-deploy.sql.gz`, checksum, migration status, PM2/Nginx/MySQL state, `activation.log`, `smoke-results.txt`, `stage-dir.txt` và `rollback-runtime-path.txt`. Record có mode directory `700`; file có thể chứa dữ liệu nhạy cảm có mode `600`.

Kiểm tra record gần nhất mà không đọc secrets:

```bash
ls -dt /www/backup/mitoo-release-* | head -n 1
```

Sau khi xác định đúng record:

```bash
grep -E '^(DEPLOY_RESULT|ACTIVATION|ROLLBACK_|DATABASE_ROLLBACK|PUBLIC_SMOKE|API_SMOKE_JSON|MYSQL_SAFETY_GATE)=' /www/backup/mitoo-release-YYYYMMDD-HHMMSS/activation.log
```

## Rollback behavior

Nếu activation thất bại sau khi PM2 bị dừng, `trap ERR` tự động:

- đưa runtime mới lỗi sang `/www/releases/mitoo-failed-*`;
- reset source về SHA trong `previous-sha.txt`;
- restore environment và tracked production data đã backup;
- restore `.next`, `node_modules`, `backend/vendor` từ runtime rollback;
- chuẩn hóa permission, rebuild Laravel cache, reload PHP-FPM và restart PM2 `glass`;
- kiểm tra local HTTP và PM2 PID;
- ghi `ROLLBACK_SOURCE`, `ROLLBACK_RUNTIME`, `ROLLBACK_PM2`.

Tìm previous SHA và runtime rollback bằng:

```bash
sed -n '1p' /www/backup/mitoo-release-YYYYMMDD-HHMMSS/previous-sha.txt
sed -n '1p' /www/backup/mitoo-release-YYYYMMDD-HHMMSS/rollback-runtime-path.txt
pm2 describe glass
pm2 pid glass
```

Không tự chạy `migrate:rollback`, `migrate:reset` hoặc restore database khi chưa xác định migration nào đã hoàn tất. Database recovery luôn là thao tác review riêng.

## Smoke tests và hairpin NAT

Không gọi public DNS của `mitoo.vn` từ chính server. Kiểm tra public pages qua local SNI:

```bash
curl --resolve 'mitoo.vn:443:127.0.0.1' -I https://mitoo.vn/
curl --resolve 'mitoo.vn:443:127.0.0.1' -I https://mitoo.vn/san-pham
curl --resolve 'mitoo.vn:443:127.0.0.1' -I https://mitoo.vn/bai-viet
curl --resolve 'mitoo.vn:443:127.0.0.1' -I https://mitoo.vn/bo-suu-tap
curl --resolve 'mitoo.vn:443:127.0.0.1' -I https://mitoo.vn/sitemap.xml
```

Kiểm tra Laravel API trực tiếp qua Nginx local:

```bash
curl -i \
  -H 'Host: mitoo.vn' \
  -H 'Accept: application/json' \
  http://127.0.0.1/api/public/collections
```

API chỉ đạt khi HTTP `200`, `Content-Type` chứa `application/json`, body parse được thành JSON và có dạng list hoặc object chứa `data` là array. HTTP `200` trả HTML, PHP warning hoặc fatal error vẫn là lỗi deploy.

## MySQL safety gate

Script yêu cầu MySQL chỉ listen ở `127.0.0.1:3306`, không listen wildcard. Mặc định deployment bị chặn khi:

```text
Threads_connected >= 80
Threads_running >= 30
```

Có thể đặt ngưỡng đã review bằng `MYSQL_MAX_CONNECTED` và `MYSQL_MAX_RUNNING`. Xem listener và trạng thái bằng tài khoản MySQL đã được cấp an toàn, không đưa password vào command line:

```bash
ss -ltn | grep ':3306'
mysql --defaults-extra-file="<secure-client-config>" \
  -e "SHOW GLOBAL STATUS WHERE Variable_name IN ('Threads_connected','Threads_running');"
```

Deploy script không restart MySQL, không kill database user, không sửa bind address, firewall hoặc emergency rules của website khác.

## Permission contract

- Laravel tracked source: directory `755`, file `644`, `backend/artisan` `755`.
- `backend/.env` và `backend/.env.production`: group của user `www`, mode `640`.
- `backend/storage` và `backend/bootstrap/cache`: group của `www`, directory `2775`, file `664`.
- Laravel phải boot thành công bằng `/www/server/php/82/bin/php` dưới user `www` trước khi activation được coi là đạt.

## Incident lessons

- `umask 077` từng tạo source mode `600`/directory `700`, khiến PHP-FPM user `www` bị `Permission denied`; script dùng `umask 022` và normalize permission.
- Composer `--no-dev` cùng manifest Laravel cũ từng giữ `NunoMaduro\\Collision`; script chỉ xóa generated PHP manifests, giữ `.gitignore`, chạy lại package discovery và xác minh provider dev không còn.
- HTTP `200` có thể vẫn là HTML/PHP warning; API smoke kiểm tra cả Content-Type, JSON parser và response shape.
- MySQL từng bị connection flood từ website khác; deploy chỉ quan sát listener/threshold và dừng trước PM2 stop nếu gate không đạt.
- Migration không bao giờ chạy mặc định và database rollback không được tự động hóa.

## Những hành vi đã loại bỏ

Quy trình mới không dùng `git pull`, `git clean`, `git stash --include-untracked`, migration vô điều kiện, `npm audit fix --force`, xóa Nginx proxy cache, reload Nginx, restart MySQL, kill database user hoặc sửa firewall/MySQL configuration.
