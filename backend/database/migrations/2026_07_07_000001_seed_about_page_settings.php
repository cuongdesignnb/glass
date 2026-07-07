<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Seed default About Page settings
        $settings = [
            [
                'key' => 'about_seo_title',
                'value' => 'Giới Thiệu | Mitoo Eyewear - Kính Mắt Thời Trang',
                'group' => 'about',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'about_seo_description',
                'value' => 'Khám phá câu chuyện thương hiệu Mitoo Eyewear. Chúng tôi cam kết mang lại sản phẩm kính mắt chất lượng premium cùng trải nghiệm AI Try-on tiên tiến nhất.',
                'group' => 'about',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'about_seo_keywords',
                'value' => 'về chúng tôi, câu chuyện thương hiệu, kính mắt mitoo, mắt kính chính hãng',
                'group' => 'about',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'about_banner',
                'value' => '',
                'group' => 'about',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'about_title',
                'value' => 'Tầm Nhìn & Câu Chuyện Thương Hiệu',
                'group' => 'about',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'about_content',
                'value' => '<h2>Câu Chuyện Thương Hiệu</h2><p>Mitoo Eyewear được ra đời với sứ mệnh mang đến những sản phẩm kính mắt thời trang chất lượng vượt trội. Chúng tôi luôn dẫn đầu xu hướng, không ngừng nâng cao trải nghiệm mua sắm thông qua công nghệ hiện đại.</p><h2>Sứ Mệnh & Tầm Nhìn</h2><p>Trở thành thương hiệu kính mắt hàng đầu được giới trẻ tin dùng, cung cấp các sản phẩm thiết kế tinh tế, chất liệu bền bỉ và bảo vệ đôi mắt tối đa.</p>',
                'group' => 'about',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'about_faqs',
                'value' => '[{"question": "Mitoo Eyewear cung cấp dịch vụ đo mắt miễn phí không?", "answer": "Có, chúng tôi hỗ trợ đo mắt miễn phí tại cửa hàng với trang thiết bị hiện đại từ Nhật Bản."}, {"question": "Chính sách bảo hành sản phẩm như thế nào?", "answer": "Tất cả sản phẩm kính mắt tại Mitoo đều được bảo hành chính hãng 12 tháng, miễn phí bảo trì và vệ sinh trọn đời."}, {"question": "Mitoo có giao hàng toàn quốc không?", "answer": "Có, Mitoo hỗ trợ giao hàng nhanh toàn quốc, miễn phí vận chuyển cho đơn hàng từ 500.000đ."}]',
                'group' => 'about',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($settings as $setting) {
            $exists = DB::table('settings')->where('key', $setting['key'])->exists();
            if (!$exists) {
                DB::table('settings')->insert($setting);
            }
        }

        // 2. Add "Giới Thiệu" to the header menus if it doesn't exist
        $menuExists = DB::table('menus')->where('url', '/gioi-thieu')->exists();
        if (!$menuExists) {
            // Find max order of header menus
            $maxOrder = DB::table('menus')
                ->where('position', 'header')
                ->whereNull('parent_id')
                ->max('order') ?: 5;

            DB::table('menus')->insert([
                'name' => 'Giới Thiệu',
                'url' => '/gioi-thieu',
                'order' => $maxOrder + 1,
                'position' => 'header',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('settings')->whereIn('key', [
            'about_seo_title',
            'about_seo_description',
            'about_seo_keywords',
            'about_banner',
            'about_title',
            'about_content',
            'about_faqs'
        ])->delete();

        DB::table('menus')->where('url', '/gioi-thieu')->delete();
    }
};
