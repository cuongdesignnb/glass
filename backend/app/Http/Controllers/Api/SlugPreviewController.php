<?php

namespace App\Http\Controllers\Api;

use App\Helpers\VietnameseSlug;
use App\Http\Controllers\Controller;
use App\Services\SlugHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class SlugPreviewController extends Controller
{
    public function __invoke(Request $request)
    {
        $data = Validator::make($request->all(), [
            'entity_type' => ['required', 'string', Rule::in(SlugHistory::types())],
            'entity_id' => ['nullable', 'integer', 'min:1'],
            'source_text' => ['required', 'string', 'max:255'],
        ])->validate();

        $entity = null;
        if (! empty($data['entity_id'])) {
            $entity = SlugHistory::entity($data['entity_type'], (int) $data['entity_id']);
            abort_if($entity === null, 404, 'Không tìm thấy nội dung cần tạo slug.');
        }

        $generatedSlug = VietnameseSlug::make($data['source_text']);

        return response()->json([
            'current_slug' => $entity?->slug,
            'generated_slug' => $generatedSlug,
            'available' => SlugHistory::isAvailable(
                $data['entity_type'],
                $generatedSlug,
                $entity?->getKey(),
            ),
        ])->header('Cache-Control', 'no-store');
    }
}
