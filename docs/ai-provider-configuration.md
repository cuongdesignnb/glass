# Tích hợp AI viết bài và sinh ảnh với hai nhà cung cấp riêng

Tài liệu này mô tả cách tích hợp AI vào một hệ thống Laravel + Next.js theo kiến trúc:

- Nội dung bài viết dùng một API tương thích OpenAI, ví dụ `modelapi.vn`.
- Hình ảnh dùng OpenAI API chính hãng với API key riêng.
- Toàn bộ cấu hình có thể quản lý trong Admin hoặc qua biến môi trường.
- Lỗi sinh nội dung làm request thất bại; lỗi sinh ảnh chỉ tạo cảnh báo và vẫn giữ bài viết.

Không đưa API key thật vào source, Git, log hoặc tài liệu.

> Tài liệu này bám theo code đang chạy trong dự án Glass, cập nhật ngày 30/07/2026. `gpt-5.5` là model chính thức có ID `gpt-5.5` và hỗ trợ cả `responses` lẫn `chat_completions`. Hệ thống hiện mặc định gọi model này qua gateway tương thích OpenAI tại `modelapi.vn`; nếu chuyển sang OpenAI chính hãng thì chỉ cần đổi Base URL/API key và nên chọn `responses`.

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

## 16. Vì sao hệ thống hiện tại chạy được `gpt-5.5`?

Luồng viết bài không phụ thuộc vào SDK hoặc một danh sách model được hard-code. Backend gọi HTTP trực tiếp theo chuẩn OpenAI-compatible và gửi model dưới dạng chuỗi cấu hình:

```text
openai_model = gpt-5.5
openai_wire_api = chat_completions
openai_base_url = https://modelapi.vn/v1
```

Request thực tế:

```http
POST https://modelapi.vn/v1/chat/completions
Authorization: Bearer <CONTENT_PROVIDER_KEY>
Content-Type: application/json
```

```json
{
  "model": "gpt-5.5",
  "messages": [
    { "role": "system", "content": "Quy tắc viết và định dạng bài" },
    { "role": "user", "content": "Chủ đề, từ khóa và yêu cầu bài viết" }
  ],
  "max_tokens": 4096
}
```

Gateway nhận model ID, route request đến channel tương ứng và trả kết quả tương thích Chat Completions. Ứng dụng đọc nội dung từ `choices[0].message.content` nên không cần biết gateway triển khai model phía sau như thế nào.

Theo tài liệu chính thức hiện tại, `gpt-5.5` có:

- Model ID: `gpt-5.5`.
- Hỗ trợ `responses`, `chat_completions` và `batch`.
- Reasoning effort: `none`, `low`, `medium`, `high`, `xhigh`.
- Context window 1.050.000 token và output tối đa 128.000 token.

Đây là giới hạn của model, không phải giá trị cần khai báo vào ứng dụng. Glass chỉ cấu hình `openai_max_tokens=4096` để giới hạn output cho một bài và kiểm soát thời gian/chi phí. Các khóa kiểu `model_context_window`, `model_auto_compact_token_limit`, `review_model` hay `network_access` là cấu hình của công cụ Codex, không dùng cho website này.

Điểm quan trọng khi mang sang hệ thống khác:

1. Gọi `GET {base_url}/models` để xác nhận provider có liệt kê model.
2. Gửi một request viết ngắn tới đúng endpoint để xác nhận provider thực sự route được model.
3. Không kết luận model sử dụng được chỉ vì nó xuất hiện trong `/models`.
4. Không tự nối thêm `/v1` nếu Base URL đã chứa `/v1`.
5. Không thêm chữ `gateway`, tên nhà cung cấp hoặc path nội bộ khác vào URL nếu tài liệu provider không yêu cầu.

## 17. Contract bài viết hoàn chỉnh

Frontend gửi `full_article=true` để yêu cầu một bài có đủ dữ liệu quản trị và SEO. Body mẫu:

```json
{
  "topic": "Cách chọn kính phù hợp khuôn mặt tròn",
  "type": "article",
  "keywords": "kính mặt tròn, chọn gọng kính",
  "tone": "professional",
  "length": "medium",
  "category_id": 3,
  "full_article": true
}
```

Các giá trị hợp lệ:

| Trường | Giá trị |
|---|---|
| `type` | `article`, `product_description`, `seo` |
| `tone` | `professional`, `casual`, `luxury` |
| `length` | `short`, `medium`, `long` |
| `full_article` | `true` để trả đủ title/SEO/tags |

Prompt yêu cầu model trả JSON thuần, không có code fence:

```json
{
  "title": "Tiêu đề bài viết",
  "excerpt": "Tóm tắt 2-3 câu",
  "content": "<h2>...</h2><p>...</p>",
  "meta_title": "SEO title tối đa 60 ký tự",
  "meta_desc": "SEO description tối đa 160 ký tự",
  "meta_keywords": "từ khóa 1, từ khóa 2",
  "tags": ["tag1", "tag2", "tag3"]
}
```

Backend cần thực hiện tuần tự:

1. Bỏ code fence có nhãn `json` hoặc `html` nếu model vẫn tự thêm vào.
2. Decode JSON và kiểm tra ít nhất trường `content`.
3. Chuẩn hóa Markdown cơ bản sang HTML khi cần.
4. Loại placeholder ảnh như `[IMG:...]`.
5. Hậu kiểm internal link và anchor text.
6. Trả `usage` nếu provider có cung cấp.

Response thành công không ảnh:

```json
{
  "success": true,
  "full_article": true,
  "title": "Cách chọn kính phù hợp khuôn mặt tròn",
  "excerpt": "...",
  "content": "<h2>...</h2><p>...</p>",
  "meta_title": "...",
  "meta_desc": "...",
  "meta_keywords": "...",
  "tags": ["kính mắt", "tư vấn kính"],
  "usage": {
    "prompt_tokens": 1000,
    "completion_tokens": 2500,
    "total_tokens": 3500
  }
}
```

Không được tin hoàn toàn JSON hoặc HTML do model trả về. Luôn validate kiểu dữ liệu, giới hạn chiều dài, sanitize HTML theo allowlist của ứng dụng và không render script/event handler.

## 18. Chọn Chat Completions hay Responses API

### Phương án giống hệ thống đang chạy qua `modelapi.vn`

```dotenv
OPENAI_BASE_URL=https://modelapi.vn/v1
OPENAI_WIRE_API=chat_completions
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=high
OPENAI_MAX_TOKENS=4096
```

Lý do dùng Chat Completions trong cấu hình mặc định là endpoint này đã được kiểm chứng hoạt động trên gateway. Trường `OPENAI_REASONING_EFFORT` vẫn được lưu nhưng không gửi trong payload Chat Completions hiện tại; gateway tự xử lý reasoning.

### Phương án gọi OpenAI chính hãng cho nội dung

```dotenv
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_WIRE_API=responses
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=high
OPENAI_MAX_TOKENS=4096
```

Request Responses API:

```json
{
  "model": "gpt-5.5",
  "instructions": "Quy tắc viết và định dạng bài",
  "input": "Chủ đề, từ khóa và yêu cầu bài viết",
  "reasoning": { "effort": "high" },
  "max_output_tokens": 4096,
  "store": false
}
```

Khi yêu cầu bài hoàn chỉnh, Glass bổ sung:

```json
{
  "text": {
    "format": {
      "type": "json_object"
    }
  }
}
```

Ứng dụng parse theo thứ tự tương thích:

1. `output_text`.
2. `response.output_text` hoặc `data.output_text` của một số gateway.
3. `choices[0].message.content` hoặc `choices[0].text`.
4. Ghép các phần tử `output[].content[]` có type `output_text`/`text`.

Nhờ lớp parse này, cùng một service có thể đổi giữa gateway Chat Completions và OpenAI Responses mà frontend không phải thay đổi.

## 19. Sinh ảnh, ALT và chú thích

Chỉ gọi endpoint có ảnh khi người dùng bật tùy chọn sinh ảnh:

```text
POST /api/ai/content-with-images
```

Body bổ sung:

```json
{
  "image_count": 2
}
```

`image_count` là số ảnh nội dung, từ 0 đến 10. Thumbnail được sinh riêng khi chế độ ảnh được bật; `image_count=0` vẫn có thể sinh thumbnail. Nếu không bật ảnh, frontend phải gọi `/api/ai/content` và không phát sinh chi phí ảnh.

Luồng xử lý ảnh hiện tại:

1. Lấy tiêu đề bài và các heading `h2`/`h3`.
2. Tạo prompt ảnh bám đúng heading, cấm chữ/logo/watermark.
3. Gọi API ảnh chính hãng bằng key riêng.
4. Nhận `b64_json` hoặc URL HTTPS.
5. Chuyển sang WebP, thu nhỏ tối đa 1600 px, quality 85.
6. Lưu file tại `storage/app/public/uploads/YYYY-MM`.
7. Tạo bản ghi `media` với `alt`, `caption`, kích thước và folder `ai-generated`.
8. Chèn ảnh inline bằng `<figure>`, `<img alt="...">` và `<figcaption>` ngay sau heading liên quan.
9. Trả riêng `thumbnail_alt` và `thumbnail_caption` để lưu vào bài viết.

Response ảnh mẫu:

```json
{
  "success": true,
  "content": "<h2>...</h2><figure>...</figure>",
  "thumbnail": "/storage/uploads/2026-07/ten-bai.webp",
  "thumbnail_alt": "Tiêu đề mô tả đúng nội dung ảnh",
  "thumbnail_caption": "Chú thích ảnh",
  "og_image": "/storage/uploads/2026-07/ten-bai.webp",
  "images": [
    {
      "type": "inline",
      "heading_tag": "h2",
      "heading": "Cách chọn kiểu gọng",
      "url": "/storage/uploads/2026-07/cach-chon-kieu-gong-2.webp",
      "alt": "Cách chọn kiểu gọng",
      "caption": "Cách chọn kiểu gọng"
    }
  ],
  "warnings": []
}
```

ALT phải mô tả đúng nội dung ảnh và ngữ cảnh heading, không nhồi từ khóa. Caption có thể giống ALT ở bản đầu nhưng nên là một câu đọc tự nhiên nếu hệ thống có bước biên tập.

## 20. Internal link và anchor text đúng trang đích

Không để model tự nghĩ URL hoặc ghép anchor tùy ý. Glass làm theo cơ chế target-bound:

1. Đọc tối đa 100 bài đã xuất bản và 100 sản phẩm đang hoạt động.
2. Tính điểm liên quan giữa chủ đề/từ khóa hiện tại với title, meta keywords và thuộc tính sản phẩm.
3. Chỉ đưa các cặp đã chọn vào prompt theo dạng `URL -> danh sách anchor được phép`.
4. Ưu tiên 1 đến số link mục tiêu nếu có câu văn phù hợp; chỉ dùng 0 khi không có ngữ cảnh tự nhiên, không nhồi link để đủ số lượng.
5. Prompt yêu cầu model viết câu đang nói đúng chủ đề trang đích rồi mới gắn một cụm anchor 2-8 từ tự nhiên, không dùng CTA chung chung.
6. Sau khi model trả HTML, backend duyệt lại toàn bộ thẻ `<a>` và giữ tối đa một link cho mỗi URL.
7. Nếu model đã viết đúng cụm anchor trong đoạn `<p>` hoặc `<li>` nhưng quên `href`, backend chỉ liên kết chính cụm chữ đã có.
8. Riêng mô tả sản phẩm, nếu có đích liên quan nhưng model không trả link nào, backend thêm tối đa một câu nối ngắn trong đoạn mô tả để tránh bài bị mất toàn bộ internal link; không tạo danh sách link hoặc CTA đứng riêng.
9. Link `/bai-viet/...` hoặc `/san-pham/...` không nằm trong danh sách được phép sẽ bị gỡ nhưng giữ nguyên chữ.
10. Anchor gắn sai URL sẽ được thay bằng anchor canonical của chính URL đó.

Ví dụ dữ liệu đưa vào prompt:

```text
- article: Cách chọn kính cho mặt tròn
  -> /bai-viet/cach-chon-kinh-cho-mat-tron
  | anchor: kính cho mặt tròn | chọn kính mặt tròn

- product: Gọng kính Titanium M123
  -> /san-pham/gong-kinh-titanium-m123
  | anchor: gọng kính Titanium M123 | gọng Titanium nhẹ
```

Không bao giờ tạo một danh sách anchor tách rời danh sách URL rồi cho model ghép chéo. Đó là nguyên nhân phổ biến khiến chữ nói về chủ đề A nhưng link sang trang B.

## 21. Hàng đợi tự viết và tự đăng

Hệ thống khác muốn chạy tự động cần thêm bảng queue với tối thiểu các trường:

```text
topic, keywords, type, tone, length
with_images, image_count
auto_publish, article_category_id
status, attempts, max_attempts, error_message
article_id, scheduled_at, locked_at
last_attempt_at, next_attempt_at
started_at, processed_at, completed_at
```

Trạng thái: `pending -> processing -> done`, hoặc `pending -> processing -> pending` khi retry, và cuối cùng `failed` khi hết lượt.

Processor hiện tại:

- Chạy tối đa `ai_queue_batch_limit`, mặc định 5 và giới hạn 1-20.
- Claim item bằng một lệnh update có điều kiện để tránh hai worker xử lý cùng bài.
- Retry sau 2 phút ở lỗi lần 1, sau 5 phút ở lỗi lần 2; tối đa 3 lần.
- Khôi phục item bị kẹt `processing` quá 30 phút nếu chưa có `article_id`.
- Tạo bài và cập nhật queue trong transaction.
- `auto_publish=true` mới gán `is_published=true` và `published_at=now()`.
- Warning ảnh được lưu vào `error_message` nhưng item vẫn `done` nếu nội dung đã thành công.

Laravel Scheduler:

```php
Schedule::command('ai:queue-process')
    ->everyMinute()
    ->withoutOverlapping(30);
```

Command:

```bash
php artisan ai:queue-process
php artisan ai:queue-process --limit=1 --force
```

- `ai_queue_auto_enabled=1`: scheduler tự nhận bài đến giờ.
- `ai_queue_auto_enabled=0`: scheduler chỉ ghi heartbeat, không xử lý bài; nút xử lý thủ công có thể dùng `--force` hoặc endpoint quản trị.

Production phải giữ `php artisan schedule:work` chạy liên tục bằng PM2, systemd, Supervisor hoặc cron `schedule:run`. Với dự án Glass xem thêm `docs/deploy/ai-content-scheduler.md`.

## 22. Khung code tối thiểu để áp dụng cho Laravel khác

### Resolver theo thứ tự Database -> `.env` -> mặc định

```php
private function setting(string $dbKey, string $configKey, string $default): string
{
    $databaseValue = trim((string) Setting::getValue($dbKey, ''));
    if ($databaseValue !== '') {
        return $databaseValue;
    }

    $configValue = trim((string) config("services.openai.{$configKey}", $default));
    return $configValue !== '' ? $configValue : $default;
}
```

### Gọi provider

```php
$response = Http::timeout(180)
    ->withToken($apiKey)
    ->acceptJson()
    ->asJson()
    ->post($endpoint, $payload);

if ($response->failed()) {
    $body = $response->json() ?: [];
    $message = data_get($body, 'error.message')
        ?? data_get($body, 'message')
        ?? 'Upstream request failed';

    return response()->json([
        'error' => $message,
        'message' => $message,
        'provider_status' => $response->status(),
    ], 424);
}
```

### Routes phải là POST và cần xác thực Admin

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/ai/content', [AiController::class, 'generateContent']);
    Route::post('/ai/content-with-images', [AiController::class, 'generateContentWithImages']);
});
```

Nếu mở URL `/api/ai/content` trực tiếp trong trình duyệt, trình duyệt gửi GET và Laravel sẽ báo `GET method is not supported`. Đây không phải lỗi AI; frontend phải gửi POST kèm token đăng nhập.

## 23. Checklist kiểm thử trước production

### Cấu hình

- [ ] Chỉ lưu API key trong Admin hoặc `.env`, không nằm trong Git.
- [ ] Database ghi đè `.env`; setting rỗng không chặn fallback.
- [ ] Base URL bỏ dấu `/` cuối và bắt buộc HTTPS.
- [ ] Public settings không trả mọi khóa chứa `api_key`, `secret`, `password`, `token`.

### Nội dung `gpt-5.5`

- [ ] `/models` có model và request ngắn trả `OK`.
- [ ] Chat Completions gửi đúng `messages`/`max_tokens`.
- [ ] Responses gửi đúng `instructions`/`input`/`reasoning`/`max_output_tokens`/`store:false`.
- [ ] Parse được Chat Completions và các dạng output của Responses.
- [ ] Full article JSON có `content`, title, excerpt, SEO và tags.
- [ ] HTML được sanitize trước khi render.

### Ảnh và SEO

- [ ] Không bật ảnh thì không gọi Images API.
- [ ] Bật ảnh thì thumbnail và ảnh inline dùng key ảnh riêng.
- [ ] Lưu được cả kết quả `b64_json` và URL.
- [ ] Media có ALT/caption; HTML có `img alt` và `figcaption`.
- [ ] Một ảnh lỗi chỉ tạo warning, không làm mất bài.
- [ ] Internal link chỉ trỏ tới URL tồn tại và anchor thuộc đúng URL đó.

### Queue

- [ ] Hai worker không claim trùng một item.
- [ ] Item đến giờ tự chạy khi bật auto.
- [ ] Tắt auto không xử lý item nhưng heartbeat vẫn cập nhật.
- [ ] Retry 2 phút/5 phút, thất bại sau lần thứ ba.
- [ ] Auto publish và lưu nháp hoạt động đúng tùy chọn.
- [ ] Scheduler process vẫn online sau reboot/deploy.

## 24. Tài liệu chính thức và file nguồn tham khảo

Tài liệu OpenAI:

- [GPT-5.5 model](https://developers.openai.com/api/docs/models/gpt-5.5)
- [Responses API - Create](https://developers.openai.com/api/reference/resources/responses/methods/create)
- [Chat Completions - Create](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)
- [Image generation guide](https://developers.openai.com/api/docs/guides/image-generation)
- [GPT Image 2 model](https://developers.openai.com/api/docs/models/gpt-image-2)

Các file quan trọng trong Glass:

| Chức năng | File |
|---|---|
| Controller viết bài, parse response, ảnh, ALT/caption và anchor | `backend/app/Http/Controllers/Api/AiController.php` |
| Cấu hình `.env` | `backend/config/services.php` |
| Lưu/validate Admin settings và lọc secret | `backend/app/Http/Controllers/Api/SettingController.php` |
| Trang cấu hình Admin | `src/app/admin/settings/page.tsx` |
| API routes | `backend/routes/api.php` |
| Adapter queue gọi AI | `backend/app/Services/OpenAiArticleGenerator.php` |
| Claim/retry/tạo bài | `backend/app/Services/AiContentQueueProcessor.php` |
| Artisan command | `backend/app/Console/Commands/ProcessAiContentQueue.php` |
| Lịch mỗi phút | `backend/routes/console.php` |
| PM2 scheduler | `ecosystem.ai-scheduler.config.cjs` |
| Test provider | `backend/tests/Feature/AiProviderIntegrationTest.php` |
| Test queue | `backend/tests/Feature/AiContentQueueAutomationTest.php` |

Tách code theo các lớp trên giúp thay provider, model, frontend hoặc scheduler độc lập mà không phải viết lại toàn bộ hệ thống.
