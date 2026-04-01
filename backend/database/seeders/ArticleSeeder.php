<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ArticleSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        $articles = [
            // --- TƯ VẤN KÍNH ---
            [
                'title'        => 'Cách Chọn Kính Phù Hợp Với Khuôn Mặt Của Bạn',
                'slug'         => 'cach-chon-kinh-phu-hop-voi-khuon-mat',
                'excerpt'      => 'Hướng dẫn chi tiết cách xác định hình dạng khuôn mặt và chọn kiểu gọng kính phù hợp nhất để tôn lên vẻ đẹp tự nhiên của bạn.',
                'content'      => $this->contentTuVan1(),
                'author'       => 'Chuyên gia Glass',
                'tags'         => json_encode(['tu-van']),
                'is_published' => true,
                'is_featured'  => true,
                'views'        => 2840,
                'published_at' => $now->copy()->subDays(2),
                'meta_title'   => 'Cách Chọn Kính Phù Hợp Khuôn Mặt | Glass Eyewear',
                'meta_desc'    => 'Hướng dẫn chọn kính theo khuôn mặt: Oval, Tròn, Vuông, Tim, Dài',
            ],
            [
                'title'        => 'Kính Cận Và Kính Râm: Khi Nào Nên Dùng Loại Nào?',
                'slug'         => 'kinh-can-va-kinh-ram-khi-nao-nen-dung',
                'excerpt'      => 'Phân tích sự khác biệt giữa kính cận và kính râm, giúp bạn hiểu rõ công dụng và thời điểm sử dụng hợp lý nhất.',
                'content'      => $this->contentTuVan2(),
                'author'       => 'Bs. Mắt Minh Tuấn',
                'tags'         => json_encode(['tu-van', 'kien-thuc']),
                'is_published' => true,
                'is_featured'  => false,
                'views'        => 1560,
                'published_at' => $now->copy()->subDays(5),
            ],

            // --- XU HƯỚNG ---
            [
                'title'        => 'Top 5 Xu Hướng Kính Mắt 2026: Phong Cách Nào Đang Làm Mưa Làm Gió?',
                'slug'         => 'top-5-xu-huong-kinh-mat-2026',
                'excerpt'      => 'Từ gọng oversized đến kiểu rimless siêu mỏng, cùng khám phá những xu hướng kính mắt đang được yêu thích nhất trong năm 2026.',
                'content'      => $this->contentXuHuong1(),
                'author'       => 'Editor Glass',
                'tags'         => json_encode(['xu-huong']),
                'is_published' => true,
                'is_featured'  => true,
                'views'        => 4210,
                'published_at' => $now->copy()->subDays(1),
                'meta_title'   => 'Xu Hướng Kính Mắt 2026 | Glass Eyewear',
                'meta_desc'    => 'Top 5 xu hướng kính mắt thịnh hành nhất năm 2026',
            ],
            [
                'title'        => 'Kính Gọng Nhỏ Retro Trở Lại: Phong Trào "Y2K Eyewear"',
                'slug'         => 'kinh-gong-nho-retro-tro-lai-phong-trao-y2k',
                'excerpt'      => 'Phong cách kính gọng nhỏ của thập niên 90-2000s đang trở lại cực kỳ mạnh mẽ. Tìm hiểu cách phối đồ với xu hướng Y2K này.',
                'content'      => $this->contentXuHuong2(),
                'author'       => 'Fashion Team',
                'tags'         => json_encode(['xu-huong', 'review']),
                'is_published' => true,
                'is_featured'  => false,
                'views'        => 3100,
                'published_at' => $now->copy()->subDays(7),
            ],

            // --- CHĂM SÓC KÍNH ---
            [
                'title'        => '5 Bí Quyết Vàng Bảo Quản Kính Mắt Bền Lâu',
                'slug'         => '5-bi-quyet-vang-bao-quan-kinh-mat-ben-lau',
                'excerpt'      => 'Kính mắt của bạn sẽ bền hơn nhiều nếu bạn biết cách vệ sinh và bảo quản đúng cách. Đừng bỏ qua 5 mẹo đơn giản này!',
                'content'      => $this->contentChamSoc1(),
                'author'       => 'Glass Care Team',
                'tags'         => json_encode(['cham-soc']),
                'is_published' => true,
                'is_featured'  => false,
                'views'        => 1890,
                'published_at' => $now->copy()->subDays(10),
            ],
            [
                'title'        => 'Làm Sạch Tròng Kính Đúng Cách: Tránh Ngay 3 Sai Lầm Phổ Biến',
                'slug'         => 'lam-sach-trong-kinh-dung-cach',
                'excerpt'      => 'Nhiều người vô tình làm xước tròng kính chỉ vì những thói quen vệ sinh sai cách. Cùng xem bạn có đang mắc phải không?',
                'content'      => $this->contentChamSoc2(),
                'author'       => 'Glass Care Team',
                'tags'         => json_encode(['cham-soc', 'kien-thuc']),
                'is_published' => true,
                'is_featured'  => false,
                'views'        => 2240,
                'published_at' => $now->copy()->subDays(14),
            ],

            // --- KIẾN THỨC ---
            [
                'title'        => 'Phân Biệt Tròng Kính Đơn Tụ, Lưỡng Tiêu Và Đa Tụ Điểm',
                'slug'         => 'phan-biet-trong-kinh-don-tu-luong-tieu-da-tu-diem',
                'excerpt'      => 'Hiểu rõ sự khác biệt giữa các loại tròng kính giúp bạn lựa chọn đúng sản phẩm phù hợp với nhu cầu sử dụng thực tế.',
                'content'      => $this->contentKienThuc1(),
                'author'       => 'Bs. Mắt Minh Tuấn',
                'tags'         => json_encode(['kien-thuc']),
                'is_published' => true,
                'is_featured'  => false,
                'views'        => 3450,
                'published_at' => $now->copy()->subDays(18),
            ],
            [
                'title'        => 'Chỉ Số UV400 Trên Kính Râm Có Ý Nghĩa Gì?',
                'slug'         => 'chi-so-uv400-tren-kinh-ram-co-y-nghia-gi',
                'excerpt'      => 'UV400 không chỉ là con số marketing – đây là tiêu chuẩn bảo vệ mắt quan trọng bạn cần biết khi chọn mua kính râm.',
                'content'      => $this->contentKienThuc2(),
                'author'       => 'Chuyên gia Glass',
                'tags'         => json_encode(['kien-thuc', 'tu-van']),
                'is_published' => true,
                'is_featured'  => false,
                'views'        => 2670,
                'published_at' => $now->copy()->subDays(22),
            ],

            // --- TIN TỨC ---
            [
                'title'        => 'Glass Eyewear Ra Mắt Bộ Sưu Tập "Heritage 2026" – Vẻ Đẹp Vượt Thời Gian',
                'slug'         => 'glass-ra-mat-bo-suu-tap-heritage-2026',
                'excerpt'      => 'BST Heritage 2026 lấy cảm hứng từ kiến trúc Art Deco và những chiếc kính kinh điển của thế kỷ 20, mang đến nét thanh lịch trường tồn.',
                'content'      => $this->contentTinTuc1(),
                'author'       => 'Glass PR',
                'tags'         => json_encode(['tin-tuc']),
                'is_published' => true,
                'is_featured'  => true,
                'views'        => 5100,
                'published_at' => $now->copy()->subDays(3),
            ],
            [
                'title'        => 'Glass Mở Rộng Dịch Vụ Thử Kính AI – Miễn Phí Cho Tất Cả Khách Hàng',
                'slug'         => 'glass-mo-rong-dich-vu-thu-kinh-ai',
                'excerpt'      => 'Công nghệ AI Try-on của Glass nay được nâng cấp với độ chính xác cao hơn và tích hợp ngay trên website, không cần cài app.',
                'content'      => $this->contentTinTuc2(),
                'author'       => 'Glass PR',
                'tags'         => json_encode(['tin-tuc']),
                'is_published' => true,
                'is_featured'  => false,
                'views'        => 1820,
                'published_at' => $now->copy()->subDays(8),
            ],

            // --- ĐÁNH GIÁ ---
            [
                'title'        => 'Review Thực Tế: Gọng Kính Titan Có Thực Sự Tốt Hơn Acetate?',
                'slug'         => 'review-thuc-te-gong-kinh-titan-vs-acetate',
                'excerpt'      => 'Chúng tôi đã dùng thử cả hai trong 3 tháng. Đây là đánh giá thực tế nhất về độ bền, trọng lượng và sự phù hợp hàng ngày.',
                'content'      => $this->contentReview1(),
                'author'       => 'Review Team',
                'tags'         => json_encode(['review', 'kien-thuc']),
                'is_published' => true,
                'is_featured'  => false,
                'views'        => 3780,
                'published_at' => $now->copy()->subDays(12),
            ],
            [
                'title'        => 'Đánh Giá: Aviator Classic Gold – Chiếc Kính Không Bao Giờ Lỗi Mốt',
                'slug'         => 'danh-gia-aviator-classic-gold',
                'excerpt'      => 'Aviator đã tồn tại hơn 80 năm và vẫn là biểu tượng thời trang. Phiên bản Classic Gold của Glass có gì khác biệt?',
                'content'      => $this->contentReview2(),
                'author'       => 'Review Team',
                'tags'         => json_encode(['review']),
                'is_published' => true,
                'is_featured'  => false,
                'views'        => 2950,
                'published_at' => $now->copy()->subDays(20),
            ],
        ];

        foreach ($articles as $article) {
            DB::table('articles')->insert(array_merge($article, [
                'meta_title'    => $article['meta_title'] ?? $article['title'] . ' | Glass Eyewear',
                'meta_desc'     => $article['meta_desc'] ?? $article['excerpt'],
                'meta_keywords' => 'kính mắt, ' . implode(', ', json_decode($article['tags'], true)),
                'created_at'    => $article['published_at'],
                'updated_at'    => $article['published_at'],
            ]));
        }

        $this->command->info('✅ Đã tạo ' . count($articles) . ' bài viết mẫu!');
    }

    // =========================================================
    // NỘI DUNG BÀI VIẾT
    // =========================================================

    private function contentTuVan1(): string
    {
        return <<<HTML
<h2>Bước 1: Xác Định Hình Dạng Khuôn Mặt</h2>
<p>Trước khi chọn kính, điều quan trọng nhất là hiểu rõ hình dạng khuôn mặt của bạn. Hãy buộc tóc gọn lại, đứng trước gương và dùng son môi vạch theo đường viền khuôn mặt trên kính. So sánh hình dạng đó với các kiểu phổ biến dưới đây.</p>

<h2>Các Hình Dạng Khuôn Mặt Phổ Biến</h2>

<h3>Mặt Oval (Bầu Dục)</h3>
<p>Đây là hình dạng lý tưởng nhất – cân đối, trán rộng hơn cằm một chút, xương má là điểm rộng nhất. <strong>Tin vui: hầu hết mọi kiểu kính đều phù hợp với mặt oval!</strong> Bạn có thể thoải mái thử từ aviator, rectangle đến cat-eye.</p>

<h3>Mặt Tròn</h3>
<p>Chiều rộng và chiều dài gần bằng nhau, đường viền mềm mại. Nên chọn <strong>kính gọng góc cạnh</strong> như rectangle, square để tạo cảm giác khuôn mặt thon dài hơn. Tránh kính gọng tròn vì sẽ làm mặt trông tròn hơn.</p>

<h3>Mặt Vuông</h3>
<p>Trán rộng, xương hàm vuông, đường viền mạnh mẽ. Chọn <strong>kính gọng tròn hoặc oval</strong> để làm mềm các đường nét góc cạnh. Kính rimless cũng là lựa chọn tuyệt vời.</p>

<h3>Mặt Tim</h3>
<p>Trán rộng, cằm nhọn. Nên chọn kính có <strong>phần dưới rộng hơn phần trên</strong> như aviator, browline để cân bằng tỷ lệ.</p>

<h3>Mặt Dài</h3>
<p>Trán, má và cằm có chiều rộng tương đương nhưng khuôn mặt dài. Kính <strong>oversized hoặc gọng to cao</strong> giúp khuôn mặt trông cân đối hơn.</p>

<h2>Lưu Ý Quan Trọng Khi Chọn Kính</h2>
<blockquote>Hình dạng khuôn mặt chỉ là gợi ý, không phải quy tắc cứng nhắc. Quan trọng nhất là bạn cảm thấy tự tin và thoải mái khi đeo kính.</blockquote>

<p>Ngoài hình dạng mặt, hãy cân nhắc thêm:</p>
<ul>
  <li><strong>Màu da:</strong> Tone ấm hợp với gọng màu nâu, vàng. Tone lạnh hợp với đen, bạc, xanh.</li>
  <li><strong>Kích thước mặt:</strong> Kính phải vừa vặn – không quá to, không quá nhỏ.</li>
  <li><strong>Mục đích sử dụng:</strong> Đi làm, thể thao hay dạo phố có yêu cầu khác nhau.</li>
</ul>

<p>Đội ngũ tư vấn tại Glass Eyewear luôn sẵn sàng hỗ trợ bạn tìm chiếc kính hoàn hảo. Hãy ghé cửa hàng hoặc thử tính năng <strong>Thử Kính AI</strong> trực tiếp trên website!</p>
HTML;
    }

    private function contentTuVan2(): string
    {
        return <<<HTML
<h2>Kính Cận (Prescription Glasses)</h2>
<p>Kính cận được thiết kế để hiệu chỉnh các tật khúc xạ như cận thị, viễn thị, loạn thị. Tròng kính cận có độ cong chính xác theo đơn của bác sĩ nhãn khoa.</p>

<h3>Khi nào cần dùng kính cận?</h3>
<ul>
  <li>Khi bạn nhìn mờ ở khoảng cách xa (cận thị)</li>
  <li>Khi nhìn gần bị mờ, đặc biệt khi đọc sách (viễn thị/lão thị)</li>
  <li>Khi nhìn bị méo hoặc lệch (loạn thị)</li>
  <li>Khi bị đau đầu thường xuyên do mắt phải điều tiết nhiều</li>
</ul>

<h2>Kính Râm (Sunglasses)</h2>
<p>Kính râm bảo vệ mắt khỏi tia UV có hại từ ánh nắng mặt trời. Tròng kính râm chất lượng tốt phải đạt chuẩn UV400 – chặn 100% tia UVA và UVB.</p>

<h3>Khi nào cần đeo kính râm?</h3>
<ul>
  <li>Khi ra ngoài trời nắng, đặc biệt từ 10h-16h</li>
  <li>Khi lái xe ban ngày</li>
  <li>Khi đi biển, leo núi, trượt tuyết – môi trường phản chiếu mạnh</li>
  <li>Sau phẫu thuật mắt hoặc khi mắt nhạy cảm</li>
</ul>

<blockquote>Bạn có thể đặt tròng kính cận vào khung kính râm – gọi là "kính râm cận". Đây là giải pháp tiện lợi cho người vừa cận vừa cần bảo vệ mắt khỏi nắng.</blockquote>

<h2>Kết Luận</h2>
<p>Không có loại nào "tốt hơn" – mỗi loại phục vụ mục đích riêng. Lý tưởng nhất là bạn nên có cả hai: một cặp kính cận cho sinh hoạt hàng ngày và một cặp kính râm cho những ngày nắng.</p>
HTML;
    }

    private function contentXuHuong1(): string
    {
        return <<<HTML
<h2>1. Gọng Oversized – "Bigger Is Better"</h2>
<p>Gọng kính to bản tiếp tục thống trị xu hướng 2026. Từ các sàn diễn Gucci, Balenciaga đến những người nổi tiếng, kính oversized tạo ra phong thái mạnh mẽ, cá tính và cực kỳ thời thượng. Màu sắc hot nhất là đen bóng và tortoise shell.</p>

<h2>2. Rimless (Không Gọng) Siêu Mỏng</h2>
<p>Đối nghịch hoàn toàn với oversized, kính rimless lại thu hút bởi sự tối giản tinh tế. Tròng kính mỏng, không có gọng bao quanh tạo cảm giác nhẹ nhàng và sang trọng – phù hợp cho môi trường công sở chuyên nghiệp.</p>

<h2>3. Tinted Lens – Tròng Kính Màu Pastel</h2>
<p>Tròng kính màu pastel nhẹ (hồng, xanh lavender, vàng nhạt) đang cực kỳ thịnh hành sau khi xuất hiện tràn ngập trên Instagram và TikTok. Không chỉ là kính râm, tòng màu pastel còn được dùng cho kính thời trang không độ.</p>

<blockquote>Xu hướng tròng màu pastel không chỉ dừng ở thời trang – nhiều người dùng chúng như công cụ giảm đau đầu khi nhìn màn hình lâu (blue light filter tinted).</blockquote>

<h2>4. Cat-Eye Phiên Bản 2026</h2>
<p>Cat-eye kinh điển được "làm mới" với góc đuôi vểnh cao hơn, gọng dày hơn và tông màu táo bạo hơn. Phiên bản 2026 thách thức quan niệm cũ rằng cat-eye chỉ dành cho phụ nữ – nam giới đang adopt xu hướng này ngày càng nhiều.</p>

<h2>5. Metal Thin Frame – Gọng Kim Loại Mảnh</h2>
<p>Techwear và aesthetics tối giản đang thúc đẩy xu hướng gọng kim loại cực mảnh. Titan là chất liệu vua – nhẹ, bền và hypoallergenic. Hình dạng phổ biến là round và hexagon nhỏ gọn.</p>

<p>Dù xu hướng nào, chiếc kính đẹp nhất luôn là chiếc bạn tự tin nhất khi đeo. Hãy thử <strong>tính năng AI Try-on</strong> của Glass để xem kiểu kính nào hợp với bạn nhất!</p>
HTML;
    }

    private function contentXuHuong2(): string
    {
        return <<<HTML
<h2>Y2K Eyewear Là Gì?</h2>
<p>Y2K (Year 2000) là phong trào thời trang hoài cổ lấy cảm hứng từ cuối thập niên 1990 đến đầu 2000s. Trong đó, kính gọng nhỏ – đặc biệt là gọng oval siêu nhỏ, gọng tròn nhỏ và kính màu đậm – là biểu tượng đặc trưng nhất.</p>

<h2>Những Kiểu Kính Y2K Đang Hot</h2>
<h3>Matrix Glasses</h3>
<p>Cảm hứng từ bộ phim The Matrix (1999), kiểu kính oval nhỏ gọng kim loại mảnh đang cực hot. Màu ưa thích: đen tuyền, vàng gold, đồng.</p>

<h3>Tinted Tiny Frames</h3>
<p>Gọng siêu nhỏ với tròng màu – xanh biển, vàng chanh, đỏ. Paris Hilton, Bella Hadid là những người tiên phong mang lại sức sống cho kiểu này.</p>

<h3>Shield Visor</h3>
<p>Kính tấm chắn dạng one-piece lens rộng bản, thường có tròng màu gradient. Táo bạo, futuristic – perfect cho aesthetics Y2K.</p>

<h2>Cách Phối Đồ Với Kính Y2K</h2>
<ul>
  <li>Crop top + low-rise jeans + kính oval nhỏ màu vàng</li>
  <li>Blazer oversized + mini skirt + kính matrix đen</li>
  <li>Athleisure set + kính shield visor màu xanh</li>
</ul>

<blockquote>Lưu ý: Kính gọng nhỏ Y2K cần khoảng cách đồng tử (PD) chính xác để đảm bảo thấu kính nằm đúng tâm mắt. Hãy đo PD trước khi đặt tròng cận.</blockquote>
HTML;
    }

    private function contentChamSoc1(): string
    {
        return <<<HTML
<h2>Tại Sao Bảo Quản Kính Đúng Cách Quan Trọng?</h2>
<p>Một chiếc kính chất lượng cao có thể dùng bền 5-10 năm nếu được chăm sóc đúng cách. Ngược lại, những thói quen sai có thể làm hỏng tròng kính chỉ sau vài tháng.</p>

<h2>Bí Quyết 1: Luôn Dùng Hộp Đựng Kính</h2>
<p>Khi không đeo, hãy cho kính vào hộp cứng chuyên dụng. Không bao giờ đặt kính ngửa tròng xuống bàn – điều này gây xước tròng nhanh chóng. Cũng đừng để kính trong túi quần hoặc túi xách không có bọc bảo vệ.</p>

<h2>Bí Quyết 2: Vệ Sinh Đúng Cách Mỗi Ngày</h2>
<p>Rửa kính dưới vòi nước ấm (không nóng), dùng nước rửa chuyên dụng hoặc xà phòng nhẹ không chứa dầu. Lau bằng khăn microfiber sạch. <strong>Không dùng giấy tissue, vải thường hoặc áo phông</strong> – các sợi vải thô sẽ tạo vết xước vi mô trên tròng.</p>

<h2>Bí Quyết 3: Tránh Nhiệt Độ Cao</h2>
<p>Không để kính trong xe ô tô dưới nắng – nhiệt độ trong xe có thể lên đến 80°C, đủ để làm cong gọng acetate và hỏng lớp phủ tròng. Cũng tránh để gần bếp, lò vi sóng hoặc máy sấy tóc.</p>

<h2>Bí Quyết 4: Tháo Kính Bằng Hai Tay</h2>
<p>Luôn dùng hai tay khi tháo và đeo kính. Tháo một tay liên tục sẽ làm gọng bị méo, không đều hai bên và mất form.</p>

<h2>Bí Quyết 5: Kiểm Tra Và Siết Ốc Vít Định Kỳ</h2>
<p>Các ốc vít ở bản lề kính có thể lỏng dần theo thời gian. Ghé tiệm kính 3-6 tháng/lần để kiểm tra và điều chỉnh. Glass Eyewear cung cấp dịch vụ này <strong>hoàn toàn miễn phí</strong> cho khách hàng đã mua kính tại cửa hàng.</p>

<blockquote>Kính của bạn là đầu tư cho sức khỏe và phong cách. Chăm sóc chúng như bạn chăm sóc bản thân!</blockquote>
HTML;
    }

    private function contentChamSoc2(): string
    {
        return <<<HTML
<h2>Sai Lầm 1: Dùng Áo Phông Lau Kính</h2>
<p>Đây là sai lầm phổ biến nhất. Dù vải áo phông có vẻ mềm mại, bề mặt sợi vải thực ra rất thô ở cấp độ vi mô. Mỗi lần lau bạn đang tạo ra hàng trăm vết xước nhỏ trên tròng. Sau nhiều lần, tròng sẽ mờ dần và không thể phục hồi.</p>

<p><strong>Giải pháp:</strong> Chỉ dùng khăn microfiber chuyên dụng đi kèm kính. Giặt khăn thường xuyên vì bụi bẩn bám lên khăn cũng sẽ gây xước.</p>

<h2>Sai Lầm 2: Dùng Nước Rửa Chén Hoặc Cồn</h2>
<p>Nước rửa chén có độ pH không phù hợp và có thể ăn mòn lớp phủ chống lóa, chống UV trên tròng. Cồn isopropyl và acetone phá hủy lớp phủ tròng và làm hỏng gọng acetate.</p>

<p><strong>Giải pháp:</strong> Dùng nước rửa kính chuyên dụng (dạng spray) hoặc xà phòng tay nhẹ không chứa dầu/dưỡng ẩm.</p>

<h2>Sai Lầm 3: Chùi Kính Khi Tròng Còn Khô</h2>
<p>Lau tròng khi không có nước hoặc dung dịch vệ sinh là cách nhanh nhất để tạo xước. Bụi bẩn và cát mịn trên bề mặt tròng sẽ trà sát như giấy nhám.</p>

<p><strong>Giải pháp:</strong> Luôn rửa tròng dưới vòi nước chảy trước khi lau. Nếu không có nước, xịt dung dịch vệ sinh kính vào trước.</p>

<h2>Quy Trình Vệ Sinh Chuẩn</h2>
<ol>
  <li>Rửa tay sạch trước</li>
  <li>Xả kính dưới vòi nước ấm</li>
  <li>Nhỏ 1-2 giọt xà phòng nhẹ lên tròng, xoa nhẹ bằng ngón tay</li>
  <li>Xả sạch lại với nước ấm</li>
  <li>Vẩy nhẹ để ráo nước</li>
  <li>Lau nhẹ nhàng bằng khăn microfiber sạch</li>
</ol>
HTML;
    }

    private function contentKienThuc1(): string
    {
        return <<<HTML
<h2>Tròng Kính Đơn Tụ (Single Vision)</h2>
<p>Đây là loại phổ biến nhất, toàn bộ tròng có cùng một độ. Phù hợp cho người:</p>
<ul>
  <li>Chỉ cận thị hoặc chỉ viễn thị</li>
  <li>Loạn thị đơn thuần</li>
  <li>Chưa bị ảnh hưởng bởi lão thị (thường dưới 40 tuổi)</li>
</ul>
<p>Ưu điểm: Giá rẻ, hình ảnh sắc nét, ít gây chói hơn. Nhược điểm: Chỉ hiệu chỉnh một vấn đề khúc xạ.</p>

<h2>Tròng Kính Lưỡng Tiêu (Bifocal)</h2>
<p>Tròng lưỡng tiêu có hai vùng độ rõ ràng – phần trên để nhìn xa, phần dưới để nhìn gần. Có thể nhìn thấy đường phân cách giữa hai vùng (gọi là "segment line").</p>
<p>Phù hợp cho: Người lão thị cần đọc sách nhưng cũng cần nhìn xa rõ ràng.</p>
<blockquote>Nhược điểm lớn nhất của bifocal là "image jump" – hình ảnh bị nhảy khi mắt chuyển vùng nhìn, gây khó chịu và mất thời gian thích nghi.</blockquote>

<h2>Tròng Kính Đa Tụ Điểm (Progressive)</h2>
<p>Còn gọi là no-line bifocal. Không có đường phân cách – độ chuyển mượt mà từ nhìn xa (phần trên) → khoảng cách trung bình (giữa) → nhìn gần (phần dưới).</p>

<h3>Ưu điểm Progressive:</h3>
<ul>
  <li>Thẩm mỹ hơn – không ai biết bạn đang đeo kính lão</li>
  <li>Nhìn ở mọi khoảng cách mà không cần đổi kính</li>
  <li>Không có image jump</li>
</ul>

<h3>Nhược điểm:</h3>
<ul>
  <li>Giá cao hơn đáng kể</li>
  <li>Cần 1-2 tuần thích nghi</li>
  <li>Vùng nhìn ngoại vi đôi khi bị méo ở tròng rẻ tiền</li>
</ul>

<p><strong>Khuyến nghị của chuyên gia Glass:</strong> Người cần tròng progressive nên chọn loại chất lượng cao để giảm vùng méo và tăng comfort. Đừng tiết kiệm ở phần này!</p>
HTML;
    }

    private function contentKienThuc2(): string
    {
        return <<<HTML
<h2>UV Là Gì Và Tại Sao Nguy Hiểm?</h2>
<p>Tia cực tím (UV) từ mặt trời chia làm 3 loại: UVA (320-400nm), UVB (280-320nm) và UVC (100-280nm). UVC bị khí quyển chặn lại. UVA và UVB là tác nhân gây:</p>
<ul>
  <li>Đục thủy tinh thể (cataract) – nguyên nhân mù lòa hàng đầu thế giới</li>
  <li>Thoái hóa điểm vàng (macular degeneration)</li>
  <li>Viêm giác mạc do nắng (photokeratitis) – giống như "cháy nắng" ở mắt</li>
  <li>Ung thư da mi mắt</li>
</ul>

<h2>UV400 Nghĩa Là Gì?</h2>
<p>UV400 là chuẩn bảo vệ chặn 100% tia UV có bước sóng từ 100nm đến 400nm – bao gồm toàn bộ UVA và UVB. Đây là tiêu chuẩn tối thiểu bạn nên chọn khi mua kính râm.</p>

<blockquote><strong>Cảnh báo:</strong> Màu tối của tròng kính KHÔNG đồng nghĩa với khả năng chống UV tốt. Kính râm đen giả không có UV400 thực ra còn nguy hiểm hơn – đồng tử giãn ra do ánh sáng giảm nhưng UV vẫn lọt vào.</blockquote>

<h2>Phân Biệt UV400 Thật Và Giả</h2>
<p>Cách duy nhất để xác nhận kính có thực sự chống UV400 không là dùng máy đo UV spectrometer. Tại Glass Eyewear, tất cả kính râm đều đi kèm chứng nhận UV400 từ nhà sản xuất và có thể kiểm tra trực tiếp tại cửa hàng.</p>

<h2>Polarized Vs. UV400 – Khác Gì Nhau?</h2>
<p>Đây là câu hỏi nhiều khách thắc mắc:</p>
<ul>
  <li><strong>UV400:</strong> Chặn tia UV gây hại cho mắt</li>
  <li><strong>Polarized:</strong> Giảm chói phản chiếu từ bề mặt nước, đường nhựa, kính xe</li>
</ul>
<p>Kính tốt nhất kết hợp cả hai: <strong>Polarized + UV400</strong>. Nếu phải chọn một, UV400 quan trọng hơn về mặt sức khỏe.</p>
HTML;
    }

    private function contentTinTuc1(): string
    {
        return <<<HTML
<h2>BST Heritage 2026 – Giới Thiệu</h2>
<p>Glass Eyewear chính thức ra mắt bộ sưu tập "Heritage 2026" – một hành trình trở về với vẻ đẹp kinh điển, nơi nghệ thuật Art Deco gặp gỡ công nghệ sản xuất kính hiện đại.</p>

<h2>Cảm Hứng Thiết Kế</h2>
<p>BST Heritage lấy cảm hứng từ những chiếc kính xuất hiện trong các bộ phim kinh điển thập niên 1920-1940, kết hợp với các đường nét hình học đặc trưng của phong cách Art Deco – đường thẳng, hình học, đối xứng hoàn hảo.</p>

<h3>Điểm Nhấn Của BST</h3>
<ul>
  <li><strong>Gọng Browline Heritage Gold:</strong> Titanium mạ vàng 18K, gọng nửa khung kinh điển</li>
  <li><strong>Round Deco Silver:</strong> Gọng tròn bạc nguyên chất, nhẹ chỉ 12g</li>
  <li><strong>Octagon Art Deco:</strong> Khung bát giác độc đáo, hiếm gặp trên thị trường Việt Nam</li>
</ul>

<blockquote>"Heritage 2026 là lời tôn vinh những chiếc kính đã trở thành biểu tượng văn hóa – không phải xu hướng nhất thời mà là phong cách vĩnh cửu." – Nhà sáng lập Glass Eyewear</blockquote>

<h2>Chất Liệu Và Sản Xuất</h2>
<p>Mỗi cặp kính trong BST Heritage được làm thủ công, sử dụng titanium nguyên chất nhập từ Nhật Bản và acetate Mazzucchelli từ Ý – các vật liệu tốt nhất trong ngành.</p>

<h2>Phân Phối Và Giá Cả</h2>
<p>BST Heritage 2026 có mặt độc quyền tại Glass Eyewear từ ngày 1/4/2026. Giá từ 4.500.000đ – 8.900.000đ. Số lượng giới hạn, chỉ 50 cặp mỗi mẫu.</p>
HTML;
    }

    private function contentTinTuc2(): string
    {
        return <<<HTML
<h2>Công Nghệ AI Try-On Thế Hệ Mới</h2>
<p>Glass Eyewear vừa ra mắt phiên bản 2.0 của tính năng thử kính ảo bằng AI – nhanh hơn, chính xác hơn và không cần cài đặt ứng dụng nào.</p>

<h2>Điều Gì Mới Trong Phiên Bản 2.0?</h2>
<h3>Độ Chính Xác Tăng 40%</h3>
<p>Thuật toán nhận diện khuôn mặt mới sử dụng 68 điểm mốc thay vì 30 điểm trong phiên bản cũ. Kết quả: kính ngồi đúng vị trí hơn, tỷ lệ scale chính xác hơn.</p>

<h3>Trực Tiếp Trên Website</h3>
<p>Bạn không cần tải app về điện thoại nữa. Chỉ cần truy cập glass.vn, nhấn "Thử Kính AI", cho phép truy cập camera và bắt đầu – hoàn toàn trong trình duyệt web.</p>

<h3>Thử Được Tất Cả Sản Phẩm</h3>
<p>Trước đây chỉ một số sản phẩm hỗ trợ AI try-on. Nay 100% sản phẩm trên website đều có thể thử ảo.</p>

<blockquote>Kết quả khảo sát nội bộ: 78% khách hàng sử dụng AI try-on mua kính trong cùng phiên duyệt web. Con số này cao gấp đôi so với khách không dùng tính năng này.</blockquote>

<h2>Cách Sử Dụng</h2>
<ol>
  <li>Vào trang sản phẩm bất kỳ</li>
  <li>Nhấn nút "Thử Kính AI"</li>
  <li>Cho phép truy cập camera</li>
  <li>Đặt khuôn mặt trong khung hướng dẫn</li>
  <li>Kính sẽ tự động xuất hiện trên khuôn mặt của bạn!</li>
</ol>
HTML;
    }

    private function contentReview1(): string
    {
        return <<<HTML
<h2>Phương Pháp Đánh Giá</h2>
<p>Chúng tôi đã thử nghiệm 2 cặp kính cùng kiểu dáng – một cặp gọng titan, một cặp gọng acetate – trong suốt 3 tháng, đánh giá trên các tiêu chí: trọng lượng, độ bền, tính thẩm mỹ và chi phí.</p>

<h2>Titan – Nhẹ Như Lông Hồng, Bền Như Sắt Thép</h2>
<h3>Ưu điểm:</h3>
<ul>
  <li><strong>Trọng lượng:</strong> Chỉ 10-15g – hầu như không cảm thấy đang đeo</li>
  <li><strong>Độ bền:</strong> Kháng gỉ sét, chịu được va đập tốt, không biến dạng khi gặp nhiệt</li>
  <li><strong>Hypoallergenic:</strong> Không gây dị ứng da – phù hợp da nhạy cảm</li>
  <li><strong>Linh hoạt:</strong> Có thể bẻ cong nhẹ mà không gãy, tự hồi phục form</li>
</ul>
<h3>Nhược điểm:</h3>
<ul>
  <li>Ít màu sắc và hoa văn hơn acetate</li>
  <li>Giá cao hơn 30-50%</li>
  <li>Cảm giác lạnh khi chạm vào da mùa đông</li>
</ul>

<h2>Acetate – Màu Sắc Vô Tận, Cá Tính Riêng</h2>
<h3>Ưu điểm:</h3>
<ul>
  <li><strong>Màu sắc:</strong> Hàng ngàn màu, hoa văn, gradient – thiên đường cho người yêu thời trang</li>
  <li><strong>Ấm áp:</strong> Không lạnh khi chạm da, thoải mái hơn mùa lạnh</li>
  <li><strong>Sửa chữa được:</strong> Có thể gia nhiệt để chỉnh lại form</li>
  <li><strong>Giá hợp lý hơn:</strong> Cùng thiết kế, acetate thường rẻ hơn titan</li>
</ul>
<h3>Nhược điểm:</h3>
<ul>
  <li>Nặng hơn – đặc biệt mệt mỏi khi đeo cả ngày</li>
  <li>Có thể bị gãy nếu rơi mạnh</li>
  <li>Biến dạng ở nhiệt độ cao (để trong xe nắng)</li>
</ul>

<h2>Kết Luận: Nên Chọn Gì?</h2>
<blockquote>Nếu ưu tiên <strong>sức khỏe và thoải mái dài hạn</strong> → chọn Titan. Nếu ưu tiên <strong>thời trang và phong cách cá nhân</strong> → chọn Acetate.</blockquote>
<p>Lý tưởng nhất: sở hữu cả hai! Một cặp titan cho công việc hàng ngày, một cặp acetate thời trang cho buổi tối và cuối tuần.</p>
HTML;
    }

    private function contentReview2(): string
    {
        return <<<HTML
<h2>Lịch Sử Của Aviator</h2>
<p>Aviator ra đời năm 1936 bởi Bausch & Lomb, thiết kế ban đầu cho phi công quân sự Mỹ. Tuy nhiên, chính Tom Cruise trong Top Gun (1986) đã biến nó thành biểu tượng thời trang toàn cầu. Gần 90 năm sau, aviator vẫn là một trong những kiểu kính bán chạy nhất thế giới.</p>

<h2>Đánh Giá Aviator Classic Gold Của Glass</h2>

<h3>Thiết Kế (9/10)</h3>
<p>Trung thành với silhouette teardrop kinh điển nhưng được tinh chỉnh tinh tế. Gọng kép (double bridge) mạ vàng 18K sáng bóng, bản lề nhỏ gọn. Nhìn ở mọi góc đều đẹp.</p>

<h3>Chất Lượng Thi Công (8.5/10)</h3>
<p>Titan 100%, ốc vít inox không gỉ. Sau 5 tháng sử dụng hàng ngày, không có dấu hiệu mờ mạ hay lỏng bản lề. Gọng chịu được vài lần rơi mà không biến dạng.</p>

<h3>Sự Thoải Mái (8/10)</h3>
<p>Nhẹ (14g), miếng đỡ mũi silicon mềm. Đeo 8 tiếng liên tục không bị đau tai hay nặng sống mũi. Trừ 2 điểm vì bản lề hơi cứng lúc đầu, cần thời gian "break in".</p>

<h3>Tròng Kính (9/10)</h3>
<p>Tròng vàng gradient (80% trên → 40% dưới), chống UV400, phủ anti-scratch và anti-reflection. Độ truyền ánh sáng vừa phải – không quá tối, lái xe buổi chiều thoải mái.</p>

<h2>So Sánh Với Các Competitor</h2>
<p>Ở tầm giá 1.990.000đ, Aviator Classic Gold của Glass cạnh tranh trực tiếp với Ray-Ban RB3025 (khoảng 2.5-3tr hàng chính hãng) và vượt trội về tỷ lệ giá/chất lượng.</p>

<blockquote><strong>Verdict:</strong> 4.5/5 ⭐ – Đây là chiếc kính aviator đáng tiền nhất trong tầm giá dưới 2 triệu tại Việt Nam. Recommended!</blockquote>
HTML;
    }
}
