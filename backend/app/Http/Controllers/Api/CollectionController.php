<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use App\Helpers\VietnameseSlug;
use Illuminate\Http\Request;

class CollectionController extends Controller
{
    /**
     * Public: Get active collections (ordered) with product count
     */
    public function index(Request $request)
    {
        $query = Collection::withCount('products')->orderBy('order');

        // Public call: only active
        if (!$request->boolean('all', false)) {
            $query->where('is_active', true);
        }

        return response()->json($query->get());
    }

    /**
     * Get single collection by slug or id — includes products
     */
    public function show(string $slugOrId)
    {
        $collection = Collection::with(['products' => function ($q) {
                $q->where('is_active', true)->orderByPivot('order');
            }])
            ->withCount('products')
            ->where('slug', $slugOrId)
            ->orWhere('id', is_numeric($slugOrId) ? $slugOrId : 0)
            ->firstOrFail();

        return response()->json($collection);
    }

    /**
     * Admin: Create collection
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'          => 'required|string|max:255',
            'description'   => 'nullable|string|max:500',
            'tag'           => 'nullable|string|max:50',
            'variant'       => 'nullable|string|max:50',
            'size'          => 'nullable|in:normal,tall,wide',
            'image'         => 'nullable|string',
            'gradient_from' => 'nullable|string|max:7',
            'gradient_to'   => 'nullable|string|max:7',
            'accent_color'  => 'nullable|string|max:7',
            'order'         => 'nullable|integer',
            'is_active'     => 'nullable|boolean',
        ]);

        $data['slug'] = VietnameseSlug::make($data['name']);
        if (Collection::where('slug', $data['slug'])->exists()) {
            $data['slug'] .= '-' . time();
        }

        $data['size'] = $data['size'] ?? 'normal';
        $data['order'] = $data['order'] ?? Collection::max('order') + 1;

        $collection = Collection::create($data);

        // Sync products if provided
        if ($request->has('product_ids') && is_array($request->product_ids)) {
            $syncData = [];
            foreach ($request->product_ids as $i => $pid) {
                $syncData[$pid] = ['order' => $i];
            }
            $collection->products()->sync($syncData);
        }

        return response()->json($collection->load('products')->loadCount('products'), 201);
    }

    /**
     * Admin: Update collection
     */
    public function update(Request $request, Collection $collection)
    {
        $data = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'description'   => 'nullable|string|max:500',
            'tag'           => 'nullable|string|max:50',
            'variant'       => 'nullable|string|max:50',
            'size'          => 'nullable|in:normal,tall,wide',
            'image'         => 'nullable|string',
            'gradient_from' => 'nullable|string|max:7',
            'gradient_to'   => 'nullable|string|max:7',
            'accent_color'  => 'nullable|string|max:7',
            'order'         => 'nullable|integer',
            'is_active'     => 'nullable|boolean',
        ]);

        if (isset($data['name'])) {
            $newSlug = VietnameseSlug::make($data['name']);
            if ($newSlug !== $collection->slug) {
                $exists = Collection::where('slug', $newSlug)->where('id', '!=', $collection->id)->exists();
                $data['slug'] = $exists ? $newSlug . '-' . time() : $newSlug;
            }
        }

        $collection->update($data);

        // Sync products if provided
        if ($request->has('product_ids') && is_array($request->product_ids)) {
            $syncData = [];
            foreach ($request->product_ids as $i => $pid) {
                $syncData[$pid] = ['order' => $i];
            }
            $collection->products()->sync($syncData);
        }

        return response()->json($collection->load('products')->loadCount('products'));
    }

    /**
     * Admin: Delete collection
     */
    public function destroy(Collection $collection)
    {
        $collection->products()->detach();
        $collection->delete();
        return response()->json(['message' => 'Xóa bộ sưu tập thành công']);
    }

    /**
     * Admin: Reorder collections
     */
    public function reorder(Request $request)
    {
        $items = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:collections,id',
            'items.*.order' => 'required|integer',
        ]);

        foreach ($items['items'] as $item) {
            Collection::where('id', $item['id'])->update(['order' => $item['order']]);
        }

        return response()->json(['message' => 'Sắp xếp thành công']);
    }
}
