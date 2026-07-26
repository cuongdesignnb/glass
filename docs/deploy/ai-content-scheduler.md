# Vận hành bộ lập lịch nội dung AI

Hệ thống dùng Laravel Scheduler để nhận các bài đến giờ và PM2 để giữ `schedule:work` chạy trên máy chủ. Trình duyệt admin chỉ theo dõi trạng thái; đóng tab không dừng hàng đợi.

## Triển khai release có migration

Chỉ thực hiện sau khi pull request đã được review, merge và có SHA đầy đủ trên `origin/main`:

```bash
cd /www/wwwroot/kinhmathongnhung.vn

DEPLOY_SHA="<merge-sha>" CHECK_ONLY=1 bash deploy.sh
DEPLOY_SHA="<merge-sha>" ALLOW_MIGRATIONS=1 bash deploy.sh
```

Lần triển khai đầu tiên có migration bổ sung cột cho `ai_content_queue`. Migration giữ dữ liệu hiện có và để `auto_publish=false` cho các item cũ. Không bỏ qua bước `CHECK_ONLY` và sao lưu cơ sở dữ liệu của quy trình deploy.

## Bootstrap scheduler lần đầu

Safe deploy sẽ restart `glass-ai-scheduler` nếu process đã tồn tại. Nếu chưa có, kết quả deploy ghi `AI_SCHEDULER_BOOTSTRAP_REQUIRED=YES`; khi đó chạy một trong hai cách sau đúng một lần:

```bash
cd /www/wwwroot/kinhmathongnhung.vn
bash scripts/deploy/ensure-ai-scheduler.sh
```

Hoặc chạy thủ công tương đương:

```bash
cd /www/wwwroot/kinhmathongnhung.vn
pm2 start ecosystem.ai-scheduler.config.cjs --only glass-ai-scheduler
pm2 save
```

Script bootstrap là idempotent: process chưa có thì được tạo, process đã có thì chỉ `glass-ai-scheduler` được restart. Script không restart ứng dụng PM2 khác.

## Xác minh PM2

```bash
pm2 describe glass-ai-scheduler
pm2 pid glass-ai-scheduler
```

PID phải là số nguyên khác `0`, trạng thái phải là `online`, và command phải chạy PHP 8.2 tại thư mục `backend`.

## Xác minh Laravel Schedule

```bash
cd /www/wwwroot/kinhmathongnhung.vn/backend
/www/server/php/82/bin/php artisan schedule:list
```

Danh sách phải có `ai:queue-process` chạy mỗi phút. Có thể xem contract của command mà không xử lý bài bằng:

```bash
/www/server/php/82/bin/php artisan ai:queue-process --help
```

## Xác minh heartbeat và hàng đợi

- Admin UI: mở `/admin/ai-queue`; thẻ trạng thái phải hiển thị “Scheduler server: Online” trong tối đa ba phút sau khi process khởi động.
- Queue status API: khi đã đăng nhập admin, gọi `GET /api/ai/queue-status` và kiểm tra `scheduler_online`, `scheduler_last_seen_at`, các count và `next_scheduled_at`.
- Database: kiểm tra các khóa `ai_queue_scheduler_last_seen_at`, `ai_queue_scheduler_last_run_at`, `ai_queue_scheduler_last_success_at` và `ai_queue_scheduler_last_result` trong bảng settings.
- Laravel log: tìm các prefix `AI_QUEUE_RUN_STARTED`, `AI_QUEUE_ITEM_CLAIMED`, `AI_QUEUE_ITEM_DONE`, `AI_QUEUE_ITEM_RETRY`, `AI_QUEUE_ITEM_FAILED`, `AI_QUEUE_STALE_ITEM_RECOVERED` và `AI_QUEUE_RUN_FINISHED`.

Không đưa API key, token, Authorization header, mật khẩu database hoặc nội dung `.env` vào lệnh kiểm tra, tài liệu hay log hỗ trợ.

## Sự cố thường gặp

- `Scheduler server: Offline`: kiểm tra `pm2 describe`, PID và hai file `backend/storage/logs/ai-scheduler-*.log`.
- Auto đang tắt: bật lại trong admin hoặc cập nhật setting; command vẫn ghi heartbeat nhưng không nhận item.
- Item chờ retry: xem `attempts`, `next_attempt_at` và `error_message`; hệ thống tự thử lại sau 2 phút rồi 5 phút, sau lần thứ ba chuyển `failed`.
- Item kẹt `processing`: processor tự phục hồi lock cũ hơn 30 phút nếu item chưa có `article_id`.
- Nhiều bài lỗi: xử lý nguyên nhân gateway/cấu hình trước, sau đó dùng “Thử lại tất cả bài lỗi” trong admin.

Tài liệu này là runbook; không tự động thực thi bất kỳ lệnh production nào.
