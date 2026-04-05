<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ProductAttribute;

class ProductAttributeSeeder extends Seeder
{
    public function run(): void
    {
        $attributes = [
            // Genders
            ['type' => 'gender', 'value' => 'nam', 'label' => 'Nam', 'sort_order' => 1],
            ['type' => 'gender', 'value' => 'nu', 'label' => 'Nữ', 'sort_order' => 2],
            ['type' => 'gender', 'value' => 'unisex', 'label' => 'Unisex', 'sort_order' => 3],

            // Face Shapes  
            ['type' => 'face_shape', 'value' => 'tron', 'label' => 'Tròn', 'sort_order' => 1],
            ['type' => 'face_shape', 'value' => 'vuong', 'label' => 'Vuông', 'sort_order' => 2],
            ['type' => 'face_shape', 'value' => 'oval', 'label' => 'Oval', 'sort_order' => 3],
            ['type' => 'face_shape', 'value' => 'tim', 'label' => 'Trái Tim', 'sort_order' => 4],
            ['type' => 'face_shape', 'value' => 'dai', 'label' => 'Dài', 'sort_order' => 5],

            // Frame Styles
            ['type' => 'frame_style', 'value' => 'tron', 'label' => 'Gọng Tròn', 'sort_order' => 1],
            ['type' => 'frame_style', 'value' => 'vuong', 'label' => 'Gọng Vuông', 'sort_order' => 2],
            ['type' => 'frame_style', 'value' => 'cat-eye', 'label' => 'Cat-Eye', 'sort_order' => 3],
            ['type' => 'frame_style', 'value' => 'aviator', 'label' => 'Aviator', 'sort_order' => 4],
            ['type' => 'frame_style', 'value' => 'rectangle', 'label' => 'Rectangle', 'sort_order' => 5],
            ['type' => 'frame_style', 'value' => 'browline', 'label' => 'Browline', 'sort_order' => 6],
            ['type' => 'frame_style', 'value' => 'rimless', 'label' => 'Không Gọng', 'sort_order' => 7],
            ['type' => 'frame_style', 'value' => 'semi-rimless', 'label' => 'Nửa Gọng', 'sort_order' => 8],

            // Materials
            ['type' => 'material', 'value' => 'kim-loai', 'label' => 'Kim Loại', 'sort_order' => 1],
            ['type' => 'material', 'value' => 'nhua', 'label' => 'Nhựa', 'sort_order' => 2],
            ['type' => 'material', 'value' => 'titan', 'label' => 'Titan', 'sort_order' => 3],
            ['type' => 'material', 'value' => 'go', 'label' => 'Gỗ', 'sort_order' => 4],
            ['type' => 'material', 'value' => 'acetate', 'label' => 'Acetate', 'sort_order' => 5],
            ['type' => 'material', 'value' => 'tr90', 'label' => 'TR90', 'sort_order' => 6],
            ['type' => 'material', 'value' => 'carbon', 'label' => 'Carbon Fiber', 'sort_order' => 7],

            // Colors
            ['type' => 'color', 'value' => 'den', 'label' => 'Đen', 'extra' => '#000000', 'sort_order' => 1],
            ['type' => 'color', 'value' => 'trang', 'label' => 'Trắng', 'extra' => '#FFFFFF', 'sort_order' => 2],
            ['type' => 'color', 'value' => 'bac', 'label' => 'Bạc', 'extra' => '#C0C0C0', 'sort_order' => 3],
            ['type' => 'color', 'value' => 'vang', 'label' => 'Vàng', 'extra' => '#FFD700', 'sort_order' => 4],
            ['type' => 'color', 'value' => 'rose-gold', 'label' => 'Rose Gold', 'extra' => '#B76E79', 'sort_order' => 5],
            ['type' => 'color', 'value' => 'nau', 'label' => 'Nâu', 'extra' => '#8B4513', 'sort_order' => 6],
            ['type' => 'color', 'value' => 'navy', 'label' => 'Navy', 'extra' => '#000080', 'sort_order' => 7],
            ['type' => 'color', 'value' => 'do-dam', 'label' => 'Đỏ Đậm', 'extra' => '#8B0000', 'sort_order' => 8],
            ['type' => 'color', 'value' => 'xam-dam', 'label' => 'Xám Đậm', 'extra' => '#2F4F4F', 'sort_order' => 9],
            ['type' => 'color', 'value' => 'tortoise', 'label' => 'Tortoise', 'extra' => '#D2691E', 'sort_order' => 10],
            ['type' => 'color', 'value' => 'hong', 'label' => 'Hồng', 'extra' => '#FF69B4', 'sort_order' => 11],
            ['type' => 'color', 'value' => 'xanh-duong', 'label' => 'Xanh Dương', 'extra' => '#4169E1', 'sort_order' => 12],
            ['type' => 'color', 'value' => 'xanh-la', 'label' => 'Xanh Lá', 'extra' => '#228B22', 'sort_order' => 13],
            ['type' => 'color', 'value' => 'tim', 'label' => 'Tím', 'extra' => '#800080', 'sort_order' => 14],
            ['type' => 'color', 'value' => 'cam', 'label' => 'Cam', 'extra' => '#FF8C00', 'sort_order' => 15],
            ['type' => 'color', 'value' => 'kem', 'label' => 'Kem', 'extra' => '#F5F5DC', 'sort_order' => 16],
            ['type' => 'color', 'value' => 'trong-suot', 'label' => 'Trong Suốt', 'extra' => 'transparent', 'sort_order' => 17],
        ];

        foreach ($attributes as $attr) {
            ProductAttribute::updateOrCreate(
                ['type' => $attr['type'], 'value' => $attr['value']],
                $attr
            );
        }
    }
}
