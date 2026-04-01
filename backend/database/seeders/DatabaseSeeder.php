<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Setting;
use App\Models\Category;
use App\Models\Product;
use App\Models\Menu;
use App\Models\Banner;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Helpers\VietnameseSlug;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin user
        User::create([
            'name' => 'Admin',
            'email' => 'admin@glass.vn',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        // Default settings
        $settings = [
            ['key' => 'site_name', 'value' => 'Glass Eyewear', 'group' => 'general'],
            ['key' => 'site_description', 'value' => 'Cửa hàng kính mắt thời trang cao cấp', 'group' => 'general'],
            ['key' => 'site_logo', 'value' => '', 'group' => 'general'],
            ['key' => 'site_favicon', 'value' => '', 'group' => 'general'],
            ['key' => 'contact_phone', 'value' => '0123 456 789', 'group' => 'contact'],
            ['key' => 'contact_email', 'value' => 'info@glass.vn', 'group' => 'contact'],
            ['key' => 'contact_address', 'value' => '123 Nguyễn Huệ, Q.1, TP.HCM', 'group' => 'contact'],
            ['key' => 'seo_title', 'value' => 'Glass Eyewear - Kính Mắt Thời Trang Cao Cấp', 'group' => 'seo'],
            ['key' => 'seo_description', 'value' => 'Cửa hàng kính mắt thời trang cao cấp. Đa dạng kiểu dáng, chất liệu premium.', 'group' => 'seo'],
            ['key' => 'seo_keywords', 'value' => 'kính mắt, kính thời trang, kính cận, kính râm', 'group' => 'seo'],
            ['key' => 'social_facebook', 'value' => '', 'group' => 'social'],
            ['key' => 'social_instagram', 'value' => '', 'group' => 'social'],
            ['key' => 'social_youtube', 'value' => '', 'group' => 'social'],
            ['key' => 'google_analytics_id', 'value' => '', 'group' => 'api'],
        ];

        foreach ($settings as $setting) {
            Setting::create($setting);
        }

        // Categories
        $categories = [
            ['name' => 'Kính Cận', 'order' => 1],
            ['name' => 'Kính Râm', 'order' => 2],
            ['name' => 'Kính Thời Trang', 'order' => 3],
            ['name' => 'Gọng Kính', 'order' => 4],
            ['name' => 'Tròng Kính', 'order' => 5],
        ];

        foreach ($categories as $cat) {
            Category::create([
                'name' => $cat['name'],
                'slug' => VietnameseSlug::make($cat['name']),
                'order' => $cat['order'],
                'is_active' => true,
            ]);
        }

        // Sample products
        $products = [
            [
                'name' => 'Aviator Classic Gold',
                'price' => 2500000,
                'sale_price' => 1990000,
                'gender' => 'unisex',
                'colors' => ['#FFD700', '#C0C0C0', '#000000'],
                'color_names' => ['Vàng', 'Bạc', 'Đen'],
                'face_shapes' => ['oval', 'tim', 'dai'],
                'frame_styles' => ['aviator'],
                'materials' => ['kim-loai'],
                'brand' => 'Glass Premium',
                'is_featured' => true,
                'is_new' => true,
                'stock' => 50,
                'category_id' => 2,
            ],
            [
                'name' => 'Rectangle Titan Pro',
                'price' => 3200000,
                'gender' => 'nam',
                'colors' => ['#000000', '#8B4513', '#C0C0C0'],
                'color_names' => ['Đen', 'Nâu', 'Bạc'],
                'face_shapes' => ['tron', 'oval'],
                'frame_styles' => ['rectangle'],
                'materials' => ['titan'],
                'brand' => 'Glass Pro',
                'is_featured' => true,
                'stock' => 35,
                'category_id' => 1,
            ],
            [
                'name' => 'Cat-Eye Vintage Rose',
                'price' => 1800000,
                'sale_price' => 1490000,
                'gender' => 'nu',
                'colors' => ['#B76E79', '#000000', '#FF69B4'],
                'color_names' => ['Rose Gold', 'Đen', 'Hồng'],
                'face_shapes' => ['vuong', 'dai'],
                'frame_styles' => ['cat-eye'],
                'materials' => ['acetate'],
                'brand' => 'Glass Fashion',
                'is_new' => true,
                'stock' => 40,
                'category_id' => 3,
            ],
            [
                'name' => 'Browline Heritage',
                'price' => 2800000,
                'gender' => 'nam',
                'colors' => ['#D2691E', '#000000'],
                'color_names' => ['Tortoise', 'Đen'],
                'face_shapes' => ['oval', 'tron'],
                'frame_styles' => ['browline'],
                'materials' => ['acetate', 'kim-loai'],
                'brand' => 'Glass Heritage',
                'is_featured' => true,
                'stock' => 25,
                'category_id' => 4,
            ],
            [
                'name' => 'Round Classic Titanium',
                'price' => 3500000,
                'gender' => 'unisex',
                'colors' => ['#C0C0C0', '#FFD700', '#000000'],
                'color_names' => ['Bạc', 'Vàng', 'Đen'],
                'face_shapes' => ['vuong', 'dai'],
                'frame_styles' => ['tron'],
                'materials' => ['titan'],
                'brand' => 'Glass Premium',
                'is_new' => true,
                'stock' => 30,
                'category_id' => 1,
            ],
            [
                'name' => 'Rimless Ultra Light',
                'price' => 4200000,
                'sale_price' => 3690000,
                'gender' => 'unisex',
                'colors' => ['#C0C0C0', '#FFD700'],
                'color_names' => ['Bạc', 'Vàng'],
                'face_shapes' => ['oval', 'tron', 'tim'],
                'frame_styles' => ['rimless'],
                'materials' => ['titan'],
                'brand' => 'Glass Luxe',
                'is_featured' => true,
                'stock' => 20,
                'category_id' => 4,
            ],
        ];

        foreach ($products as $p) {
            $p['slug'] = VietnameseSlug::make($p['name']);
            $p['description'] = "Mẫu {$p['name']} cao cấp, thiết kế tinh tế phù hợp mọi phong cách.";
            $p['is_active'] = true;
            Product::create($p);
        }

        // Default menus
        $headerMenus = [
            ['name' => 'Trang Chủ', 'url' => '/', 'order' => 1],
            ['name' => 'Sản Phẩm', 'url' => '/san-pham', 'order' => 2],
            ['name' => 'Thử Kính AI', 'url' => '/thu-kinh-ao', 'order' => 3],
            ['name' => 'Bài Viết', 'url' => '/bai-viet', 'order' => 4],
            ['name' => 'Liên Hệ', 'url' => '/lien-he', 'order' => 5],
        ];

        $parentMenu = null;
        foreach ($headerMenus as $m) {
            $menu = Menu::create(array_merge($m, ['position' => 'header', 'is_active' => true]));

            // Add sub-menus for "Sản Phẩm"
            if ($m['name'] === 'Sản Phẩm') {
                $subMenus = [
                    ['name' => 'Kính Cận', 'url' => '/san-pham?category=kinh-can', 'order' => 1],
                    ['name' => 'Kính Râm', 'url' => '/san-pham?category=kinh-ram', 'order' => 2],
                    ['name' => 'Kính Thời Trang', 'url' => '/san-pham?category=kinh-thoi-trang', 'order' => 3],
                    ['name' => 'Gọng Kính', 'url' => '/san-pham?category=gong-kinh', 'order' => 4],
                ];

                foreach ($subMenus as $sub) {
                    Menu::create(array_merge($sub, [
                        'parent_id' => $menu->id,
                        'position' => 'header',
                        'depth' => 1,
                        'is_active' => true,
                    ]));
                }
            }
        }
    }
}
