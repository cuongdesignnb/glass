<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use App\Helpers\VietnameseSlug;
use Illuminate\Http\Request;

class CollectionController extends Controller
{
    /**
     * Public: Get active collections (ordered)
     */
    public function index(Request $request)
    {
        $query = Collection::orderBy('order');

        // Public call: only active
        if (!$request->boolean('all', false)) {
            $query->where('is_active', true);
        }

        return response()->json($query->get());
    }

    /**
     * Get single collection by slug or id
     */
    public function show(string $slugOrId)
    {
        $collection = Collection::where('slug', $slugOrId)
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

        return response()->json($collection, 201);
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

        return response()->json($collection);
    }

    /**
     * Admin: Delete collection
     */
    public function destroy(Collection $collection)
    {
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
