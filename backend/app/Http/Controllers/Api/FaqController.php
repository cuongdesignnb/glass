<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Faq;
use Illuminate\Http\Request;

class FaqController extends Controller
{
    /**
     * Get FAQs. If product_id is specified, gets FAQs for that product.
     * If product_id is null, gets global FAQs.
     */
    public function index(Request $request)
    {
        $query = Faq::query()->orderBy('order', 'asc');

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        } else {
            $query->whereNull('product_id');
        }

        // For public API, only return active FAQs
        if ($request->route()->getPrefix() === 'api/public' || $request->is('api/public/*')) {
            $query->where('is_active', true);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'question' => 'required|string',
            'answer' => 'required|string',
            'product_id' => 'nullable|exists:products,id',
            'order' => 'integer',
            'is_active' => 'boolean',
        ]);

        $faq = Faq::create($request->all());
        return response()->json($faq, 201);
    }

    public function show(Faq $faq)
    {
        return response()->json($faq);
    }

    public function update(Request $request, Faq $faq)
    {
        $request->validate([
            'question' => 'string',
            'answer' => 'string',
            'product_id' => 'nullable|exists:products,id',
            'order' => 'integer',
            'is_active' => 'boolean',
        ]);

        $faq->update($request->all());
        return response()->json($faq);
    }

    public function destroy(Faq $faq)
    {
        $faq->delete();
        return response()->json(null, 204);
    }
}
