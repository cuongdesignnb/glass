<?php

namespace App\Http\Controllers\Api;

use App\Helpers\VietnameseSlug;
use App\Http\Controllers\Controller;
use App\Models\LandingPage;
use Illuminate\Http\Request;

class LandingPageController extends Controller
{
    private function requireAdmin(): void
    {
        $user = auth('sanctum')->user();
        abort_unless($user !== null && $user->isAdmin(), 403, 'Không có quyền quản lý landing page');
    }

    /** Public: one active landing page. Prices come straight from the products. */
    public function publicShow(string $slug)
    {
        $page = LandingPage::where('slug', $slug)->where('is_active', true)->firstOrFail();

        return response()->json($this->payload($page, true));
    }

    public function index()
    {
        $this->requireAdmin();

        return response()->json(
            LandingPage::withCount('products')->orderByDesc('id')->get()
        );
    }

    public function show(LandingPage $landing_page)
    {
        $this->requireAdmin();

        return response()->json($this->payload($landing_page, false));
    }

    public function store(Request $request)
    {
        $this->requireAdmin();
        $data = $this->validated($request, false);
        $data['slug'] = $this->uniqueSlug($data['slug'] ?? $data['title']);

        $page = LandingPage::create($this->attributes($data));
        $this->syncProducts($page, $data['product_ids'] ?? []);

        return response()->json($this->payload($page->refresh(), false), 201);
    }

    public function update(Request $request, LandingPage $landing_page)
    {
        $this->requireAdmin();
        $data = $this->validated($request, true);
        if (!empty($data['slug'])) {
            $data['slug'] = $this->uniqueSlug($data['slug'], $landing_page->id);
        } else {
            unset($data['slug']);
        }

        $landing_page->update($this->attributes($data));
        if (array_key_exists('product_ids', $data)) {
            $this->syncProducts($landing_page, $data['product_ids'] ?? []);
        }

        return response()->json($this->payload($landing_page->refresh(), false));
    }

    public function destroy(LandingPage $landing_page)
    {
        $this->requireAdmin();
        $landing_page->delete();

        return response()->json(['message' => 'Đã xoá landing page']);
    }

    private function validated(Request $request, bool $partial): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'title' => "$required|string|max:255",
            'slug' => ['nullable', 'string', 'max:150', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'headline' => 'nullable|string|max:255',
            'subheadline' => 'nullable|string|max:500',
            'hero_image' => 'nullable|string|max:500',
            'cta_text' => 'nullable|string|max:100',
            'promo_text' => 'nullable|string|max:255',
            'promo_ends_at' => 'nullable|date',
            'benefits' => 'nullable|array|max:8',
            'benefits.*.title' => 'required|string|max:120',
            'benefits.*.text' => 'nullable|string|max:300',
            'testimonials' => 'nullable|array|max:30',
            'testimonials.*.name' => 'required|string|max:120',
            'testimonials.*.text' => 'required|string|max:500',
            'testimonials.*.rating' => 'nullable|integer|min:1|max:5',
            'testimonials.*.variant' => 'nullable|string|max:120',
            'testimonials.*.images' => 'nullable|array|max:4',
            'testimonials.*.images.*' => 'string|max:500',
            'faqs' => 'nullable|array|max:12',
            'faqs.*.question' => 'required|string|max:255',
            'faqs.*.answer' => 'required|string|max:1000',
            // These IDs are printed inside <script> tags on the storefront, so
            // restrict them to harmless characters.
            'fb_pixel_id' => ['nullable', 'regex:/^\d{5,20}$/'],
            'tiktok_pixel_id' => ['nullable', 'regex:/^[A-Za-z0-9]{5,30}$/'],
            'google_ads_id' => ['nullable', 'regex:/^(AW|G)-[A-Za-z0-9]{5,20}$/'],
            'is_active' => 'sometimes|boolean',
            'product_ids' => 'sometimes|array|max:60',
            'product_ids.*' => 'integer|distinct|exists:products,id',
        ]);
    }

    private function attributes(array $data): array
    {
        unset($data['product_ids']);

        return $data;
    }

    private function uniqueSlug(string $base, ?int $ignoreId = null): string
    {
        $slug = preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $base) ? $base : VietnameseSlug::make($base);
        $slug = $slug !== '' ? $slug : 'landing';
        $candidate = $slug;
        $i = 2;
        while (LandingPage::where('slug', $candidate)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()) {
            $candidate = $slug . '-' . $i++;
        }

        return $candidate;
    }

    private function syncProducts(LandingPage $page, array $ids): void
    {
        $sync = [];
        foreach (array_values($ids) as $position => $id) {
            $sync[$id] = ['order' => $position];
        }
        $page->products()->sync($sync);
    }

    private function payload(LandingPage $page, bool $publicOnly): array
    {
        $products = $page->products()
            ->when($publicOnly, fn ($q) => $q->where('products.is_active', true))
            ->get();

        $out = $page->toArray();
        $out['products'] = $products->map(fn ($p) => [
            'id' => $p->id,
            'name' => $p->name,
            'slug' => $p->slug,
            'price' => $p->price,
            'sale_price' => $p->sale_price,
            'thumbnail' => $p->thumbnail,
            'images' => $p->images,
            'is_active' => (bool) $p->is_active,
        ])->values()->all();

        return $out;
    }
}
