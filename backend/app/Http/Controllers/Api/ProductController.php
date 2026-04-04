<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductAddonGroup;
use App\Helpers\VietnameseSlug;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /**
     * List products with filters
     */
    public function index(Request $request)
    {
        $query = Product::with('category');

        // Filters
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('gender')) {
            $query->filterByGender($request->gender);
        }
        if ($request->filled('color')) {
            $query->filterByColor($request->color);
        }
        if ($request->filled('face_shape')) {
            $query->filterByFaceShape($request->face_shape);
        }
        if ($request->filled('frame_style')) {
            $query->filterByFrameStyle($request->frame_style);
        }
        if ($request->filled('material')) {
            $query->filterByMaterial($request->material);
        }
        if ($request->filled('price_min') || $request->filled('price_max')) {
            $query->filterByPrice($request->price_min, $request->price_max);
        }
        if ($request->filled('is_featured')) {
            $query->featured();
        }
        if ($request->filled('is_new')) {
            $query->where('is_new', true);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        // Active filter (default: only active for public)
        if (!$request->filled('show_all')) {
            $query->active();
        }

        // Sorting
        $sort = $request->get('sort', 'newest');
        switch ($sort) {
            case 'price-asc':
                $query->orderBy('price', 'asc');
                break;
            case 'price-desc':
                $query->orderBy('price', 'desc');
                break;
            case 'popular':
                $query->orderBy('views', 'desc');
                break;
            case 'bestselling':
                $query->orderBy('sold', 'desc');
                break;
            case 'newest':
            default:
                $query->orderBy('created_at', 'desc');
                break;
        }

        $perPage = $request->get('per_page', 12);
        $products = $query->paginate($perPage);

        return response()->json($products);
    }

    /**
     * Show single product by slug or ID
     */
    public function show(string $slugOrId)
    {
        $product = Product::with(['category', 'faqs' => function($q) {
            $q->where('is_active', true)->orderBy('order', 'asc');
        }, 'addonGroups.options'])
            ->where('slug', $slugOrId)
            ->orWhere('id', is_numeric($slugOrId) ? $slugOrId : 0)
            ->firstOrFail();

        // Increment views
        $product->increment('views');

        return response()->json($product);
    }

    /**
     * Store new product
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'content' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'images' => 'nullable|array',
            'thumbnail' => 'nullable|string',
            'colors' => 'nullable|array',
            'color_names' => 'nullable|array',
            'prescription' => 'nullable|array',
            'gender' => 'nullable|string|in:nam,nu,unisex',
            'face_shapes' => 'nullable|array',
            'frame_styles' => 'nullable|array',
            'materials' => 'nullable|array',
            'brand' => 'nullable|string',
            'sku' => 'nullable|string|unique:products',
            'category_id' => 'nullable|exists:categories,id',
            'meta_title' => 'nullable|string',
            'meta_desc' => 'nullable|string',
            'meta_keywords' => 'nullable|string',
            'og_image' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'is_featured' => 'nullable|boolean',
            'is_new' => 'nullable|boolean',
            'stock' => 'nullable|integer|min:0',
            'weight' => 'nullable|string',
            'frame_width' => 'nullable|string',
            'lens_width' => 'nullable|string',
            'lens_height' => 'nullable|string',
            'bridge_width' => 'nullable|string',
            'temple_length' => 'nullable|string',
        ]);

        // Generate slug
        $data['slug'] = VietnameseSlug::make($data['name']);

        // Ensure unique slug
        $existingSlug = Product::where('slug', $data['slug'])->exists();
        if ($existingSlug) {
            $data['slug'] .= '-' . time();
        }

        $product = Product::create($data);

        if ($request->has('faqs') && is_array($request->faqs)) {
            foreach ($request->faqs as $i => $faqData) {
                if (!empty($faqData['question']) && !empty($faqData['answer'])) {
                    $product->faqs()->create([
                        'question' => $faqData['question'],
                        'answer' => $faqData['answer'],
                        'order' => $i,
                        'is_active' => $faqData['is_active'] ?? true,
                    ]);
                }
            }
        }

        // Handle addon groups
        if ($request->has('addon_groups') && is_array($request->addon_groups)) {
            $this->syncAddonGroups($product, $request->addon_groups);
        }

        return response()->json($product->load(['faqs', 'addonGroups.options']), 201);
    }

    /**
     * Update product
     */
    public function update(Request $request, Product $product)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'content' => 'nullable|string',
            'price' => 'sometimes|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'images' => 'nullable|array',
            'thumbnail' => 'nullable|string',
            'colors' => 'nullable|array',
            'color_names' => 'nullable|array',
            'prescription' => 'nullable|array',
            'gender' => 'nullable|string|in:nam,nu,unisex',
            'face_shapes' => 'nullable|array',
            'frame_styles' => 'nullable|array',
            'materials' => 'nullable|array',
            'brand' => 'nullable|string',
            'sku' => 'nullable|string|unique:products,sku,' . $product->id,
            'category_id' => 'nullable|exists:categories,id',
            'meta_title' => 'nullable|string',
            'meta_desc' => 'nullable|string',
            'meta_keywords' => 'nullable|string',
            'og_image' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'is_featured' => 'nullable|boolean',
            'is_new' => 'nullable|boolean',
            'stock' => 'nullable|integer|min:0',
            'weight' => 'nullable|string',
            'frame_width' => 'nullable|string',
            'lens_width' => 'nullable|string',
            'lens_height' => 'nullable|string',
            'bridge_width' => 'nullable|string',
            'temple_length' => 'nullable|string',
        ]);

        // Regenerate slug if name changed
        if (isset($data['name'])) {
            $newSlug = VietnameseSlug::make($data['name']);
            if ($newSlug !== $product->slug) {
                $existingSlug = Product::where('slug', $newSlug)->where('id', '!=', $product->id)->exists();
                $data['slug'] = $existingSlug ? $newSlug . '-' . time() : $newSlug;
            }
        }

        $product->update($data);

        if ($request->has('faqs') && is_array($request->faqs)) {
            $product->faqs()->delete();
            foreach ($request->faqs as $i => $faqData) {
                if (!empty($faqData['question']) && !empty($faqData['answer'])) {
                    $product->faqs()->create([
                        'question' => $faqData['question'],
                        'answer' => $faqData['answer'],
                        'order' => $i,
                        'is_active' => $faqData['is_active'] ?? true,
                    ]);
                }
            }
        }

        // Handle addon groups
        if ($request->has('addon_groups') && is_array($request->addon_groups)) {
            $this->syncAddonGroups($product, $request->addon_groups);
        }

        return response()->json($product->load(['faqs', 'addonGroups.options']));
    }

    /**
     * Delete product
     */
    public function destroy(Product $product)
    {
        $product->delete();
        return response()->json(['message' => 'Xóa sản phẩm thành công']);
    }

    /**
     * Export products to CSV (Excel-compatible)
     */
    public function exportExcel(Request $request)
    {
        $query = Product::with('category')->orderBy('id', 'asc');

        // Filter by category if provided
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->is_active === 'true' || $request->is_active === '1');
        }

        $products = $query->get();

        $headers = [
            'ID', 'SKU', 'Tên sản phẩm', 'Slug', 'Danh mục', 'Thương hiệu',
            'Giá gốc', 'Giá khuyến mãi', 'Tồn kho', 'Đã bán', 'Lượt xem',
            'Giới tính', 'Màu sắc', 'Tên màu',
            'Chất liệu', 'Kiểu gọng', 'Khuôn mặt',
            'Cân nặng', 'Chiều rộng gọng', 'Chiều rộng tròng', 'Chiều cao tròng',
            'Chiều rộng cầu', 'Chiều dài càng',
            'Mô tả ngắn', 'Ảnh đại diện', 'Ảnh chi tiết',
            'Hoạt động', 'Nổi bật', 'Mới',
            'Meta Title', 'Meta Desc', 'Meta Keywords',
            'Ngày tạo',
        ];

        $callback = function () use ($products, $headers) {
            $file = fopen('php://output', 'w');

            // UTF-8 BOM for Excel
            fwrite($file, "\xEF\xBB\xBF");

            // Header row
            fputcsv($file, $headers);

            foreach ($products as $p) {
                fputcsv($file, [
                    $p->id,
                    $p->sku ?? '',
                    $p->name,
                    $p->slug,
                    $p->category?->name ?? '',
                    $p->brand ?? '',
                    $p->price,
                    $p->sale_price ?? '',
                    $p->stock ?? 0,
                    $p->sold ?? 0,
                    $p->views ?? 0,
                    $p->gender ?? '',
                    is_array($p->colors) ? implode('|', $p->colors) : '',
                    is_array($p->color_names) ? implode('|', $p->color_names) : '',
                    is_array($p->materials) ? implode('|', $p->materials) : '',
                    is_array($p->frame_styles) ? implode('|', $p->frame_styles) : '',
                    is_array($p->face_shapes) ? implode('|', $p->face_shapes) : '',
                    $p->weight ?? '',
                    $p->frame_width ?? '',
                    $p->lens_width ?? '',
                    $p->lens_height ?? '',
                    $p->bridge_width ?? '',
                    $p->temple_length ?? '',
                    $p->description ?? '',
                    $p->thumbnail ?? '',
                    is_array($p->images) ? implode('|', $p->images) : '',
                    $p->is_active ? '1' : '0',
                    $p->is_featured ? '1' : '0',
                    $p->is_new ? '1' : '0',
                    $p->meta_title ?? '',
                    $p->meta_desc ?? '',
                    $p->meta_keywords ?? '',
                    $p->created_at?->format('Y-m-d H:i:s') ?? '',
                ]);
            }

            fclose($file);
        };

        $filename = 'san-pham-' . date('Y-m-d-His') . '.csv';

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control' => 'no-store',
        ]);
    }

    /**
     * Import products from CSV
     */
    public function importExcel(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx|max:10240',
            'mode' => 'nullable|string|in:create,update,upsert',
        ]);

        $mode = $request->get('mode', 'upsert'); // upsert = tạo mới hoặc cập nhật theo SKU
        $file = $request->file('file');

        // Read CSV
        $handle = fopen($file->getRealPath(), 'r');
        if (!$handle) {
            return response()->json(['error' => 'Không thể đọc file'], 400);
        }

        // Remove BOM if present
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        // Read header
        $headerRow = fgetcsv($handle);
        if (!$headerRow || count($headerRow) < 3) {
            fclose($handle);
            return response()->json(['error' => 'File CSV không hợp lệ hoặc thiếu header'], 400);
        }

        // Map header names to column indices
        $headerMap = [];
        $expectedHeaders = [
            'ID' => 'id', 'SKU' => 'sku', 'Tên sản phẩm' => 'name', 'Slug' => 'slug',
            'Danh mục' => 'category_name', 'Thương hiệu' => 'brand',
            'Giá gốc' => 'price', 'Giá khuyến mãi' => 'sale_price',
            'Tồn kho' => 'stock', 'Đã bán' => 'sold', 'Lượt xem' => 'views',
            'Giới tính' => 'gender', 'Màu sắc' => 'colors', 'Tên màu' => 'color_names',
            'Chất liệu' => 'materials', 'Kiểu gọng' => 'frame_styles', 'Khuôn mặt' => 'face_shapes',
            'Cân nặng' => 'weight', 'Chiều rộng gọng' => 'frame_width',
            'Chiều rộng tròng' => 'lens_width', 'Chiều cao tròng' => 'lens_height',
            'Chiều rộng cầu' => 'bridge_width', 'Chiều dài càng' => 'temple_length',
            'Mô tả ngắn' => 'description', 'Ảnh đại diện' => 'thumbnail', 'Ảnh chi tiết' => 'images',
            'Hoạt động' => 'is_active', 'Nổi bật' => 'is_featured', 'Mới' => 'is_new',
            'Meta Title' => 'meta_title', 'Meta Desc' => 'meta_desc', 'Meta Keywords' => 'meta_keywords',
        ];

        foreach ($headerRow as $index => $header) {
            $header = trim($header);
            if (isset($expectedHeaders[$header])) {
                $headerMap[$expectedHeaders[$header]] = $index;
            }
        }

        if (!isset($headerMap['name'])) {
            fclose($handle);
            return response()->json(['error' => 'File thiếu cột "Tên sản phẩm"'], 400);
        }

        // Cache categories
        $categories = \App\Models\Category::all()->keyBy(function ($c) {
            return mb_strtolower(trim($c->name));
        });

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];
        $row = 1;

        while (($data = fgetcsv($handle)) !== false) {
            $row++;

            try {
                $getValue = function ($key) use ($data, $headerMap) {
                    if (!isset($headerMap[$key])) return null;
                    $val = $data[$headerMap[$key]] ?? null;
                    return ($val !== null && $val !== '') ? trim($val) : null;
                };

                $name = $getValue('name');
                if (!$name) {
                    $skipped++;
                    continue;
                }

                $sku = $getValue('sku');
                $id = $getValue('id');

                // Tìm sản phẩm existing
                $existing = null;
                if ($mode !== 'create') {
                    if ($sku) {
                        $existing = Product::where('sku', $sku)->first();
                    }
                    if (!$existing && $id) {
                        $existing = Product::find($id);
                    }
                }

                if ($existing && $mode === 'create') {
                    $skipped++;
                    continue;
                }

                // Prepare data
                $productData = ['name' => $name];

                if ($sku !== null) $productData['sku'] = $sku;
                if ($getValue('brand') !== null) $productData['brand'] = $getValue('brand');
                if ($getValue('price') !== null) $productData['price'] = floatval($getValue('price'));
                if ($getValue('sale_price') !== null) $productData['sale_price'] = floatval($getValue('sale_price'));
                if ($getValue('stock') !== null) $productData['stock'] = intval($getValue('stock'));
                if ($getValue('gender') !== null) $productData['gender'] = $getValue('gender');
                if ($getValue('description') !== null) $productData['description'] = $getValue('description');
                if ($getValue('thumbnail') !== null) $productData['thumbnail'] = $getValue('thumbnail');
                if ($getValue('weight') !== null) $productData['weight'] = $getValue('weight');
                if ($getValue('frame_width') !== null) $productData['frame_width'] = $getValue('frame_width');
                if ($getValue('lens_width') !== null) $productData['lens_width'] = $getValue('lens_width');
                if ($getValue('lens_height') !== null) $productData['lens_height'] = $getValue('lens_height');
                if ($getValue('bridge_width') !== null) $productData['bridge_width'] = $getValue('bridge_width');
                if ($getValue('temple_length') !== null) $productData['temple_length'] = $getValue('temple_length');
                if ($getValue('meta_title') !== null) $productData['meta_title'] = $getValue('meta_title');
                if ($getValue('meta_desc') !== null) $productData['meta_desc'] = $getValue('meta_desc');
                if ($getValue('meta_keywords') !== null) $productData['meta_keywords'] = $getValue('meta_keywords');

                // Boolean fields
                if ($getValue('is_active') !== null) $productData['is_active'] = in_array($getValue('is_active'), ['1', 'true', 'yes', 'có']);
                if ($getValue('is_featured') !== null) $productData['is_featured'] = in_array($getValue('is_featured'), ['1', 'true', 'yes', 'có']);
                if ($getValue('is_new') !== null) $productData['is_new'] = in_array($getValue('is_new'), ['1', 'true', 'yes', 'có']);

                // Array fields (pipe-separated: val1|val2|val3)
                if ($getValue('colors') !== null) $productData['colors'] = array_filter(explode('|', $getValue('colors')));
                if ($getValue('color_names') !== null) $productData['color_names'] = array_filter(explode('|', $getValue('color_names')));
                if ($getValue('materials') !== null) $productData['materials'] = array_filter(explode('|', $getValue('materials')));
                if ($getValue('frame_styles') !== null) $productData['frame_styles'] = array_filter(explode('|', $getValue('frame_styles')));
                if ($getValue('face_shapes') !== null) $productData['face_shapes'] = array_filter(explode('|', $getValue('face_shapes')));
                if ($getValue('images') !== null) $productData['images'] = array_filter(explode('|', $getValue('images')));

                // Category by name
                $catName = $getValue('category_name');
                if ($catName) {
                    $cat = $categories[mb_strtolower(trim($catName))] ?? null;
                    if ($cat) {
                        $productData['category_id'] = $cat->id;
                    }
                }

                if ($existing) {
                    // Update
                    $existing->update($productData);
                    $updated++;
                } else {
                    // Create
                    if (!isset($productData['price'])) $productData['price'] = 0;
                    $productData['slug'] = VietnameseSlug::make($name);
                    $slugExists = Product::where('slug', $productData['slug'])->exists();
                    if ($slugExists) {
                        $productData['slug'] .= '-' . time() . '-' . $row;
                    }
                    Product::create($productData);
                    $created++;
                }
            } catch (\Exception $e) {
                $errors[] = "Dòng {$row}: " . $e->getMessage();
            }
        }

        fclose($handle);

        return response()->json([
            'success' => true,
            'message' => "Import hoàn tất: {$created} tạo mới, {$updated} cập nhật, {$skipped} bỏ qua",
            'created' => $created,
            'updated' => $updated,
            'skipped' => $skipped,
            'errors' => array_slice($errors, 0, 10), // Max 10 errors
        ]);
    }

    /**
     * Download import template
     */
    public function importTemplate()
    {
        $headers = [
            'SKU', 'Tên sản phẩm', 'Danh mục', 'Thương hiệu',
            'Giá gốc', 'Giá khuyến mãi', 'Tồn kho',
            'Giới tính', 'Màu sắc', 'Tên màu',
            'Chất liệu', 'Kiểu gọng', 'Khuôn mặt',
            'Cân nặng', 'Chiều rộng gọng', 'Chiều rộng tròng', 'Chiều cao tròng',
            'Chiều rộng cầu', 'Chiều dài càng',
            'Mô tả ngắn', 'Ảnh đại diện',
            'Hoạt động', 'Nổi bật', 'Mới',
        ];

        $sampleRow = [
            'GL-001', 'Kính Aviator Classic', 'Kính mát', 'Glass',
            '1500000', '1200000', '50',
            'unisex', '#c9a96e|#333333', 'Vàng|Đen',
            'Titanium', 'Phi công', 'Oval|Tròn',
            '25g', '140mm', '55mm', '45mm',
            '18mm', '145mm',
            'Kính phi công cổ điển', '',
            '1', '1', '0',
        ];

        $callback = function () use ($headers, $sampleRow) {
            $file = fopen('php://output', 'w');
            fwrite($file, "\xEF\xBB\xBF");
            fputcsv($file, $headers);
            fputcsv($file, $sampleRow);
            fclose($file);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="mau-import-san-pham.csv"',
        ]);
    }

    /**
     * Sync addon groups and options for a product
     */
    private function syncAddonGroups(Product $product, array $groups): void
    {
        // Delete existing groups (cascade deletes options)
        $product->addonGroups()->delete();

        foreach ($groups as $i => $groupData) {
            if (empty($groupData['name'])) continue;

            $group = $product->addonGroups()->create([
                'name' => $groupData['name'],
                'is_required' => $groupData['is_required'] ?? false,
                'sort_order' => $groupData['sort_order'] ?? $i,
            ]);

            if (!empty($groupData['options']) && is_array($groupData['options'])) {
                foreach ($groupData['options'] as $j => $optionData) {
                    if (empty($optionData['name'])) continue;

                    $group->options()->create([
                        'name' => $optionData['name'],
                        'additional_price' => $optionData['additional_price'] ?? 0,
                        'is_default' => $optionData['is_default'] ?? ($j === 0),
                        'sort_order' => $optionData['sort_order'] ?? $j,
                    ]);
                }
            }
        }
    }
}
