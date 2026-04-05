<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /**
     * Public: Get approved reviews for a product
     */
    public function productReviews(Request $request, $productId)
    {
        $reviews = Review::where('product_id', $productId)
            ->approved()
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 10));

        // Calculate aggregate rating
        $stats = Review::where('product_id', $productId)
            ->approved()
            ->selectRaw('COUNT(*) as count, AVG(rating) as average, 
                SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as star5,
                SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as star4,
                SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as star3,
                SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as star2,
                SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as star1')
            ->first();

        return response()->json([
            'reviews' => $reviews,
            'stats' => [
                'count' => (int) $stats->count,
                'average' => round((float) $stats->average, 1),
                'distribution' => [
                    5 => (int) $stats->star5,
                    4 => (int) $stats->star4,
                    3 => (int) $stats->star3,
                    2 => (int) $stats->star2,
                    1 => (int) $stats->star1,
                ],
            ],
        ]);
    }

    /**
     * Public: Submit a review (with optional image uploads)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'customer_name' => 'required|string|max:100',
            'customer_phone' => 'required|string|max:20',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
            'images' => 'nullable|array|max:5',
            'images.*' => 'image|mimes:jpeg,jpg,png,webp,gif|max:5120',
        ]);

        // Handle file uploads
        $imagePaths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $path = $file->store('reviews', 'public');
                $imagePaths[] = '/storage/' . $path;
            }
        }

        $review = Review::create([
            'product_id' => $validated['product_id'],
            'customer_name' => $validated['customer_name'],
            'customer_phone' => $validated['customer_phone'],
            'rating' => $validated['rating'],
            'comment' => $validated['comment'] ?? null,
            'images' => !empty($imagePaths) ? $imagePaths : null,
        ]);

        return response()->json([
            'message' => 'Đánh giá đã được gửi và đang chờ duyệt.',
            'review' => $review,
        ], 201);
    }

    /**
     * Admin: List all reviews with filters
     */
    public function index(Request $request)
    {
        $query = Review::with('product:id,name,slug,thumbnail')
            ->orderBy('created_at', 'desc');

        if ($request->has('status')) {
            if ($request->status === 'approved') {
                $query->approved();
            } elseif ($request->status === 'pending') {
                $query->pending();
            }
        }

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->has('rating')) {
            $query->where('rating', $request->rating);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_phone', 'like', "%{$search}%")
                  ->orWhere('comment', 'like', "%{$search}%");
            });
        }

        return $query->paginate($request->get('per_page', 20));
    }

    /**
     * Admin: Approve a review
     */
    public function approve(Review $review)
    {
        $review->update(['is_approved' => true]);

        return response()->json([
            'message' => 'Đánh giá đã được duyệt.',
            'review' => $review->load('product:id,name,slug'),
        ]);
    }

    /**
     * Admin: Reply to a review
     */
    public function reply(Request $request, Review $review)
    {
        $validated = $request->validate([
            'admin_reply' => 'required|string|max:1000',
        ]);

        $review->update($validated);

        return response()->json([
            'message' => 'Đã trả lời đánh giá.',
            'review' => $review,
        ]);
    }

    /**
     * Admin: Delete a review
     */
    public function destroy(Review $review)
    {
        $review->delete();

        return response()->json(['message' => 'Đã xóa đánh giá.']);
    }
}
