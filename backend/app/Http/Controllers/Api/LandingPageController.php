<?php

namespace App\Http\Controllers\Api;

use App\Helpers\VietnameseSlug;
use App\Http\Controllers\Controller;
use App\Models\AddonOptionConstraint;
use App\Models\LandingPage;
use App\Models\Product;
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
        $this->syncProducts($page, $data);

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
        if (array_key_exists('products', $data) || array_key_exists('product_ids', $data)) {
            $this->syncProducts($landing_page, $data);
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
            // Preferred over product_ids: ordered list with optional landing-only prices.
            'products' => 'sometimes|array|max:60',
            'products.*.id' => 'required|integer|distinct|exists:products,id',
            'products.*.price_override' => 'nullable|numeric|min:0|max:1000000000',
            'products.*.sale_price_override' => 'nullable|numeric|min:0|max:1000000000',
        ]);
    }

    private function attributes(array $data): array
    {
        unset($data['product_ids'], $data['products']);

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

    private function syncProducts(LandingPage $page, array $data): void
    {
        $rows = $data['products'] ?? array_map(fn ($id) => ['id' => $id], $data['product_ids'] ?? []);
        $sync = [];
        foreach (array_values($rows) as $position => $row) {
            $sync[(int) $row['id']] = [
                'order' => $position,
                'price_override' => $row['price_override'] ?? null,
                'sale_price_override' => $row['sale_price_override'] ?? null,
            ];
        }
        $page->products()->sync($sync);
    }

    private function payload(LandingPage $page, bool $publicOnly): array
    {
        $products = $page->products()
            ->when($publicOnly, fn ($q) => $q->where('products.is_active', true))
            ->with(['addonGroups.options', 'addonPrices'])
            ->get();

        $out = $page->toArray();
        $out['products'] = $products->map(function ($p) use ($publicOnly) {
            [$price, $sale] = LandingPage::effectivePrices($p);

            $row = [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'price' => $publicOnly ? $price : $p->price,
                'sale_price' => $publicOnly ? $sale : $p->sale_price,
                'thumbnail' => $p->thumbnail,
                'images' => $p->images,
                'is_active' => (bool) $p->is_active,
            ];

            if (! $publicOnly) {
                $row['price_override'] = $p->pivot->price_override;
                $row['sale_price_override'] = $p->pivot->sale_price_override;

                return $row;
            }

            $row['colors'] = $p->colors ?? [];
            $row['color_names'] = $p->color_names ?? [];
            $row['color_variants'] = $p->color_variants ?? [];
            $row['addon_groups'] = $p->addonGroups->map(fn ($g) => [
                'id' => $g->id,
                'name' => $g->name,
                'is_required' => (bool) $g->is_required,
                'options' => $g->options->map(fn ($o) => ['id' => $o->id, 'name' => $o->name])->values()->all(),
            ])->values()->all();
            $row['addon_prices'] = $p->addonPrices->map(fn ($r) => [
                'option_id' => $r->option_id,
                'additional_price' => (float) $r->additional_price,
                'is_available' => (bool) $r->is_available,
            ])->values()->all();
            $row['addon_constraints'] = $this->constraintsFor($p);

            return $row;
        })->values()->all();

        return $out;
    }

    /** Same rule as the product page: per-product constraints win over global ones. */
    private function constraintsFor(Product $product): array
    {
        $optionIds = $product->addonGroups->pluck('options')->flatten()->pluck('id')->all();
        if ($optionIds === []) {
            return [];
        }

        $scope = fn ($q) => $q->where(
            fn ($w) => $w->whereIn('option_id', $optionIds)->orWhereIn('blocked_option_id', $optionIds)
        );
        $rows = AddonOptionConstraint::where('product_id', $product->id)->tap($scope)->get();
        if ($rows->isEmpty()) {
            $rows = AddonOptionConstraint::whereNull('product_id')->tap($scope)->get();
        }

        return $rows->map(fn ($c) => ['option_id' => $c->option_id, 'blocked_option_id' => $c->blocked_option_id])
            ->values()->all();
    }
}
