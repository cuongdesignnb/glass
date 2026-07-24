<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use App\Helpers\VietnameseSlug;
use Illuminate\Http\Request;

class CollectionController extends Controller
{
    private function isAdmin(): bool
    {
        $user = auth('sanctum')->user();
        return $user !== null && $user->isAdmin();
    }

    private function requireAdmin(): void
    {
        abort_unless($this->isAdmin(), 403, 'Không có quyền quản lý bộ sưu tập');
    }

    public function index(Request $request)
    {
        $includeAll = $this->isAdmin() && $request->boolean('all', false);

        $query = Collection::withCount(['products' => function ($q) use ($includeAll) {
            if (!$includeAll) {
                $q->where('products.is_active', true);
            }
        }])->orderBy('order');

        if (!$includeAll) {
            $query->where('is_active', true);
        }

        return response()->json($query->get());
    }

    public function show(string $slugOrId)
    {
        $isAdmin = $this->isAdmin();

        $query = Collection::with(['products' => function ($q) use ($isAdmin) {
                if (!$isAdmin) {
                    $q->where('products.is_active', true);
                }
                $q->with('category')->orderByPivot('order');
            }])
            ->withCount(['products' => function ($q) use ($isAdmin) {
                if (!$isAdmin) {
                    $q->where('products.is_active', true);
                }
            }]);

        if (!$isAdmin) {
            $query->where('is_active', true);
        }

        $collection = $query
            ->where(function ($q) use ($slugOrId) {
                $q->where('slug', $slugOrId)
                  ->orWhere('id', is_numeric($slugOrId) ? $slugOrId : 0);
            })
            ->firstOrFail();

        return response()->json($collection);
    }

    public function store(Request $request)
    {
        $this->requireAdmin();

        $data = $request->validate([
            'name'          => 'required|string|max:255',
            'description'   => 'nullable|string|max:500',
            'tag'           => 'nullable|string|max:50',
            'variant'       => 'nullable|string|max:50',
            'size'          => 'nullable|in:normal,tall,wide',
            'image'         => 'nullable|string',
            'gradient_from' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'gradient_to'   => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'accent_color'  => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'order'         => 'nullable|integer|min:0',
            'is_active'     => 'nullable|boolean',
            'product_ids'   => 'nullable|array',
            'product_ids.*' => 'integer|distinct|exists:products,id',
        ]);

        $data['slug'] = VietnameseSlug::make($data['name']);
        if (Collection::where('slug', $data['slug'])->exists()) {
            $data['slug'] .= '-' . time();
        }

        $data['size'] = $data['size'] ?? 'normal';
        $data['order'] = $data['order'] ?? ((int) Collection::max('order') + 1);
        unset($data['product_ids']);

        $collection = Collection::create($data);
        $this->syncProducts($collection, $request);

        return response()->json($collection->load('products')->loadCount('products'), 201);
    }

    public function update(Request $request, Collection $collection)
    {
        $this->requireAdmin();

        $data = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'description'   => 'nullable|string|max:500',
            'tag'           => 'nullable|string|max:50',
            'variant'       => 'nullable|string|max:50',
            'size'          => 'nullable|in:normal,tall,wide',
            'image'         => 'nullable|string',
            'gradient_from' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'gradient_to'   => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'accent_color'  => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'order'         => 'nullable|integer|min:0',
            'is_active'     => 'nullable|boolean',
            'product_ids'   => 'nullable|array',
            'product_ids.*' => 'integer|distinct|exists:products,id',
        ]);

        if (isset($data['name'])) {
            $newSlug = VietnameseSlug::make($data['name']);
            if ($newSlug !== $collection->slug) {
                $exists = Collection::where('slug', $newSlug)->where('id', '!=', $collection->id)->exists();
                $data['slug'] = $exists ? $newSlug . '-' . time() : $newSlug;
            }
        }

        unset($data['product_ids']);
        $collection->update($data);
        $this->syncProducts($collection, $request);

        return response()->json($collection->load('products')->loadCount('products'));
    }

    private function syncProducts(Collection $collection, Request $request): void
    {
        if (!$request->has('product_ids')) {
            return;
        }

        $syncData = [];
        foreach ($request->input('product_ids', []) as $index => $productId) {
            $syncData[$productId] = ['order' => $index];
        }
        $collection->products()->sync($syncData);
        $collection->touch();
    }

    public function destroy(Collection $collection)
    {
        $this->requireAdmin();
        $collection->products()->detach();
        $collection->delete();
        return response()->json(['message' => 'Xóa bộ sưu tập thành công']);
    }

    public function reorder(Request $request)
    {
        $this->requireAdmin();

        $items = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:collections,id',
            'items.*.order' => 'required|integer|min:0',
        ]);

        foreach ($items['items'] as $item) {
            Collection::where('id', $item['id'])->update(['order' => $item['order']]);
        }

        return response()->json(['message' => 'Sắp xếp thành công']);
    }
}
