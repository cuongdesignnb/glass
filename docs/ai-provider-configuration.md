# Tích hợp AI viết bài và sinh ảnh với hai nhà cung cấp riêng

Tài liệu này mô tả cách tích hợp AI vào một hệ thống Laravel + Next.js theo kiến trúc:

- Nội dung bài viết dùng một API tương thích OpenAI, ví dụ `modelapi.vn`.
- Hình ảnh dùng OpenAI API chính hãng với API key riêng.
- Toàn bộ cấu hình có thể quản lý trong Admin hoặc qua biến môi trường.
- Lỗi sinh nội dung làm request thất bại; lỗi sinh ảnh chỉ tạo cảnh báo và vẫn giữ bài viết.

Không đưa API key thật vào source, Git, log hoặc tài liệu.

## 1. Kiến trúc tổng quan

```text
Admin UI
   |
   | POST /api/ai/content hoặc /api/ai/content-with-images
   v
Laravel AiController
   |-- Nội dung --> {CONTENT_BASE_URL}/chat/completions
   |                 hoặc {CONTENT_BASE_URL}/responses
   |
   `-- Hình ảnh --> {IMAGE_BASE_URL}/images/generations
                     |
                     `-- Lưu WebP vào storage và bảng media
```

Không dùng chung API key ảnh với API key nội dung. Việc tách riêng giúp:

- Giữ `modelapi.vn` cho phần viết bài có chi phí phù hợp.
- Dùng OpenAI chính hãng cho GPT Image khi gateway bên thứ ba không cấp quyền sinh ảnh.
- Tránh gửi nhầm API key của nhà cung cấp này sang nhà cung cấp khác.
- Dễ thay đổi từng nhà cung cấp độc lập.

## 2. Các khóa cấu hình

### 2.1. Cấu hình nội dung

| Khóa trong database/Admin | Biến môi trường | Mặc định | Ý nghĩa |
|---|---|---|---|
| `openai_api_key` | `OPENAI_API_KEY` | Trống | API key của nhà cung cấp nội dung |
| `openai_base_url` | `OPENAI_BASE_URL` | `https://modelapi.vn/v1` | Base URL của nhà cung cấp nội dung |
| `openai_wire_api` | `OPENAI_WIRE_API` | `chat_completions` | `chat_completions` hoặc `responses` |
| `openai_model` | `OPENAI_MODEL` | `gpt-5.5` | Model viết bài |
| `openai_reasoning_effort` | `OPENAI_REASONING_EFFORT` | `high` | Chỉ áp dụng cho Responses API |
| `openai_max_tokens` | `OPENAI_MAX_TOKENS` | `4096` | Giới hạn output, từ 1 đến 128000 |

### 2.2. Cấu hình hình ảnh chính hãng

| Khóa trong database/Admin | Biến môi trường | Mặc định | Ý nghĩa |
|---|---|---|---|
| `openai_image_api_key` | `OPENAI_IMAGE_API_KEY` | Trống | API key OpenAI chính hãng dành cho ảnh |
| `openai_image_base_url` | `OPENAI_IMAGE_BASE_URL` | `https://api.openai.com/v1` | Base URL OpenAI chính hãng |
| `openai_image_model` | `OPENAI_IMAGE_MODEL` | `gpt-image-2` | Model sinh ảnh |
| `openai_image_quality` | `OPENAI_IMAGE_QUALITY` | `medium` | `low`, `medium`, `high` hoặc `auto` |

Thứ tự ưu tiên cho mọi cấu hình:

```text
Database/Admin > backend/.env > giá trị mặc định trong code
```

Giá trị rỗng trong database không ghi đè `.env` hoặc mặc định.

## 3. Cấu hình bằng Admin

Trong trang `/admin/settings`, tạo hai nhóm rõ ràng.

### AI Provider - viết bài

```text
AI Provider API Key: key của modelapi.vn
AI Provider Base URL: https://modelapi.vn/v1
Wire API: chat_completions
Model sinh nội dung: gpt-5.5
Reasoning Effort: high
Max Output Tokens: 4096
```

### OpenAI chính hãng - sinh ảnh bài viết

```text
OpenAI Image API Key: sk-...
OpenAI Image Base URL: https://api.openai.com/v1
Model sinh ảnh: gpt-image-2
Chất lượng ảnh: medium
```

Không cần migration nếu bảng `settings` lưu dữ liệu dạng `key`, `value`, `group` và hỗ trợ khóa động.

## 4. Cấu hình bằng `.env`

Nếu hệ thống khác không có trang Admin, thêm vào file `.env` của backend:

```dotenv
# Nội dung bài viết
OPENAI_API_KEY=
OPENAI_BASE_URL=https://modelapi.vn/v1
OPENAI_WIRE_API=chat_completions
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=high
OPENAI_MAX_TOKENS=4096

# Hình ảnh OpenAI chính hãng
OPENAI_IMAGE_API_KEY=
OPENAI_IMAGE_BASE_URL=https://api.openai.com/v1
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_QUALITY=medium
```

Sau khi thay đổi `.env` trên Laravel production:

```bash
php artisan config:clear
php artisan cache:clear
```

Nếu dự án sử dụng config cache:

```bash
php artisan config:cache
```

## 5. Cấu hình Laravel

Trong `config/services.php`:

```php
'openai' => [
    'api_key'          => env('OPENAI_API_KEY', ''),
    'base_url'         => env('OPENAI_BASE_URL', 'https://modelapi.vn/v1'),
    'wire_api'         => env('OPENAI_WIRE_API', 'chat_completions'),
    'model'            => env('OPENAI_MODEL', 'gpt-5.5'),
    'reasoning_effort' => env('OPENAI_REASONING_EFFORT', 'high'),
    'max_tokens'       => (int) env('OPENAI_MAX_TOKENS', 4096),

    'image_api_key'    => env('OPENAI_IMAGE_API_KEY', ''),
    'image_base_url'   => env('OPENAI_IMAGE_BASE_URL', 'https://api.openai.com/v1'),
    'image_model'      => env('OPENAI_IMAGE_MODEL', 'gpt-image-2'),
    'image_quality'    => env('OPENAI_IMAGE_QUALITY', 'medium'),
],
```

Khi đọc cấu hình, tách thành hai resolver:

- `resolveOpenAiConfig()` cho nội dung.
- `resolveOpenAiImageConfig()` cho hình ảnh.

Không fallback `openai_image_api_key` sang `openai_api_key`. Nếu thiếu key ảnh, trả warning và bỏ qua ảnh.

## 6. Gọi API nội dung

### 6.1. Chat Completions

Với `openai_wire_api=chat_completions`, gọi:

```text
POST {openai_base_url}/chat/completions
Authorization: Bearer {openai_api_key}
Content-Type: application/json
```

Payload tối thiểu:

```json
{
  "model": "gpt-5.5",
  "messages": [
    {
      "role": "system",
      "content": "Hướng dẫn vai trò, định dạng HTML và cấu trúc bài viết"
    },
    {
      "role": "user",
      "content": "Chủ đề và từ khóa của bài viết"
    }
  ],
  "max_tokens": 4096
}
```

Không gửi `reasoning`, `store`, `instructions`, `input` hoặc `max_output_tokens` trong chế độ này nếu gateway không hỗ trợ chúng.

Đọc nội dung từ:

```text
choices[0].message.content
```

### 6.2. Responses API tùy chọn

Chỉ dùng khi nhà cung cấp xác nhận hỗ trợ `POST /responses`:

```json
{
  "model": "MODEL_ID",
  "instructions": "System instructions",
  "input": "User input",
  "reasoning": {
    "effort": "high"
  },
  "max_output_tokens": 4096,
  "store": false
}
```

Đọc nội dung từ một trong các dạng:

```text
output_text
output[].content[].text
choices[0].message.content
```

Dạng `choices` được giữ làm compatibility fallback cho các gateway trả response không hoàn toàn theo chuẩn Responses API.

## 7. Gọi OpenAI Images API chính hãng

Endpoint:

```text
POST {openai_image_base_url}/images/generations
Authorization: Bearer {openai_image_api_key}
Content-Type: application/json
```

Ví dụ payload:

```json
{
  "model": "gpt-image-2",
  "prompt": "Mô tả ảnh minh họa, không chữ, không logo, không watermark",
  "n": 1,
  "size": "1536x1024",
  "quality": "medium",
  "output_format": "png"
}
```

Ứng dụng cần hỗ trợ cả hai kiểu kết quả:

```text
data[0].b64_json
data[0].url
```

Nếu nhận URL, tải ảnh bằng HTTPS. Nếu nhận base64, decode trực tiếp. Sau đó:

1. Chuyển ảnh sang WebP.
2. Lưu vào `storage/app/public/ai-generated/...`.
3. Tạo bản ghi trong bảng `media`.
4. Trả URL dạng `/storage/...` cho frontend.

GPT Image 2 hỗ trợ endpoint `/v1/images/generations`. Xem tài liệu chính thức:

- https://developers.openai.com/api/docs/models/gpt-image-2

## 8. Hành vi lỗi

### Nội dung thất bại

- Request chính trả lỗi.
- Không tiếp tục sinh ảnh.
- Giữ message gốc của provider nếu có.
- Có thể ánh xạ lỗi upstream sang HTTP `424 Failed Dependency` để Nginx không thay JSON bằng trang HTML `502`.

Response mẫu:

```json
{
  "error": "Upstream request failed",
  "message": "Upstream request failed",
  "provider_status": 502
}
```

### Hình ảnh thất bại

- Bài viết vẫn trả HTTP 200.
- `thumbnail` có thể là `null`.
- `images` chỉ chứa ảnh thành công.
- Mọi lỗi ảnh nằm trong `warnings`.

Response mẫu:

```json
{
  "success": true,
  "content": "<h2>...</h2>",
  "thumbnail": null,
  "images": [],
  "warnings": [
    "OpenAI Image API key chinh hang chua duoc cau hinh. Bai viet van duoc tao nhung bo qua sinh anh."
  ]
}
```

Không tự động retry sang nhiều model ảnh. Việc thử hàng loạt model có thể tạo nhiều request, nhiều thông báo lỗi và khó kiểm soát chi phí.

## 9. Bảo mật

- Chỉ chấp nhận Base URL dùng HTTPS.
- Không trả API key trong public settings endpoint.
- Lọc mọi khóa chứa `api_key`, `secret`, `password` hoặc `token`.
- Không ghi API key, header `Authorization` hoặc toàn bộ request vào log.
- Chỉ log hostname, model, HTTP status, response keys và message lỗi đã giới hạn độ dài.
- Không commit `.env`.
- Dùng API key riêng cho production và thu hồi key ngay nếu bị lộ.
- OpenAI image API key cần có billing và quyền sử dụng model ảnh.

## 10. Kiểm tra model và endpoint

Không suy luận khả năng của model chỉ từ tên. Kiểm tra danh sách model của nhà cung cấp nội dung:

```bash
read -s -p "Provider API key: " PROVIDER_KEY
echo
curl -sS https://modelapi.vn/v1/models \
  -H "Authorization: Bearer ${PROVIDER_KEY}" \
  -H "Accept: application/json"
unset PROVIDER_KEY
```

Nếu model có `supported_endpoint_types: []`, model có thể được liệt kê nhưng chưa có channel hoạt động.

Kiểm tra Chat Completions bằng request ngắn trước khi đưa vào ứng dụng:

```bash
read -s -p "Provider API key: " PROVIDER_KEY
echo
curl -sS https://modelapi.vn/v1/chat/completions \
  -H "Authorization: Bearer ${PROVIDER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5.5","messages":[{"role":"user","content":"Reply only: OK"}],"max_tokens":32}'
unset PROVIDER_KEY
```

Không đưa API key trực tiếp vào command vì shell history có thể lưu lại.

## 11. Kiểm thử tự động

Tối thiểu cần có các test sau:

1. Chỉ nhập key nội dung và xác nhận request đi tới `/chat/completions`.
2. Database ghi đè `.env`, `.env` ghi đè mặc định.
3. Responses API vẫn hoạt động khi được chọn.
4. Parse được `output_text`, `output[].content[].text` và `choices[].message.content`.
5. Key ảnh và Base URL ảnh tách biệt hoàn toàn với nội dung.
6. Request ảnh đi tới `https://api.openai.com/v1/images/generations`.
7. API key nội dung không bao giờ xuất hiện trong request ảnh.
8. Thiếu key ảnh vẫn trả bài viết và warning.
9. Lỗi một ảnh không làm mất nội dung.
10. Xử lý được cả `b64_json` và URL ảnh.
11. Base URL HTTP hoặc quality không hợp lệ bị từ chối.
12. API key ảnh không xuất hiện trong public settings.

Lệnh kiểm thử tham khảo:

```bash
cd backend
php artisan test

cd ..
npx tsc --noEmit
npm run build
```

Không gọi API thật trong unit/feature test. Dùng HTTP fake để tránh chi phí và tránh phụ thuộc mạng.

## 12. Triển khai production

Quy trình mẫu:

```bash
cd /path/to/project
git pull origin main
php backend/artisan migrate --force
npm run build
pm2 restart app-name
nginx -t
nginx -s reload
```

Nếu `package.json` hoặc `package-lock.json` thay đổi, chạy trước build:

```bash
npm ci --include=dev
```

Sau deploy:

1. Nhập key nội dung và thử tạo bài không ảnh.
2. Nhập key ảnh chính hãng.
3. Chọn `image_count=0` để chỉ thử một thumbnail.
4. Kiểm tra bảng `media` và file trong storage.
5. Sau khi thumbnail thành công mới tăng số ảnh inline.

## 13. Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `Request failed` | Frontend nhận HTML thay vì JSON | Đọc response dưới dạng text, hiển thị HTTP status; kiểm tra Nginx error page |
| `Upstream request failed` | Gateway không route được model/endpoint | Kiểm tra `/models`, thử request tối thiểu, đổi `wire_api` hoặc model |
| HTTP 403 `Image generation is not enabled for this group` | Gateway không cấp quyền ảnh | Dùng OpenAI image API key chính hãng hoặc yêu cầu gateway bật quyền |
| HTTP 503 `No available channel` | Nhà cung cấp không có channel cho model | Chọn model có endpoint hoạt động hoặc đổi nhà cung cấp |
| Nội dung có nhưng không có ảnh | Ảnh thất bại được chuyển thành warning | Kiểm tra `warnings`, key ảnh, billing và bảng `media` |
| HTTP 401/403 từ OpenAI | Key sai, hết quyền hoặc chưa có billing | Kiểm tra key/project/billing trên OpenAI Platform |
| HTTP 422 Base URL | URL không hợp lệ hoặc không dùng HTTPS | Sửa Base URL về URL HTTPS hợp lệ |
| HTTP 504 | Nginx/PHP timeout | Kiểm tra `fastcgi_read_timeout`, PHP-FPM và thời gian phản hồi upstream |
| Bài hoàn chỉnh không parse JSON | Model trả markdown hoặc JSON sai | Gỡ code fence, validate JSON và fallback về raw content |

## 14. Các file tương ứng trong dự án Glass

| Chức năng | File |
|---|---|
| Điều phối request nội dung và ảnh | `backend/app/Http/Controllers/Api/AiController.php` |
| Lưu và kiểm tra Admin settings | `backend/app/Http/Controllers/Api/SettingController.php` |
| Mặc định từ `.env` | `backend/config/services.php` |
| Danh sách biến môi trường mẫu | `backend/.env.example` |
| Giao diện cấu hình Admin | `src/app/admin/settings/page.tsx` |
| Hàm gọi API từ frontend | `src/lib/api.ts` |
| Test tích hợp | `backend/tests/Feature/AiProviderIntegrationTest.php` |

## 15. Checklist mang sang hệ thống khác

- [ ] Có bảng settings dạng key-value hoặc cơ chế cấu hình tương đương.
- [ ] Nội dung và ảnh dùng API key riêng.
- [ ] Nội dung chọn đúng `chat_completions` hoặc `responses`.
- [ ] Base URL được chuẩn hóa, bỏ dấu `/` cuối và bắt buộc HTTPS.
- [ ] Model ID được kiểm tra bằng request thật tối thiểu.
- [ ] Images API gọi đúng `/images/generations`.
- [ ] Hỗ trợ cả base64 và URL ảnh.
- [ ] Có storage public và bảng media.
- [ ] Lỗi ảnh không làm mất bài viết.
- [ ] API key không xuất hiện trong public endpoint hoặc log.
- [ ] Có test HTTP fake cho cả hai provider.
- [ ] Test production với một thumbnail trước khi sinh nhiều ảnh.
