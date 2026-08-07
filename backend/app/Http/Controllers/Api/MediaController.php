<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Media;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Laravel\Facades\Image;

class MediaController extends Controller
{
    private function validateIcoFile(\Illuminate\Http\UploadedFile $file): void
    {
        $contents = @file_get_contents($file->getRealPath());
        $fileSize = is_string($contents) ? strlen($contents) : 0;

        if ($fileSize < 6) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'file' => 'The uploaded ICO file is truncated.',
            ]);
        }

        $reserved = unpack('vreserved', substr($contents, 0, 2))['reserved'];
        $type = unpack('vtype', substr($contents, 2, 2))['type'];
        $imageCount = unpack('vimage_count', substr($contents, 4, 2))['image_count'];
        $directoryEnd = 6 + ($imageCount * 16);

        if ($reserved !== 0 || $type !== 1 || $imageCount < 1 || $fileSize < $directoryEnd) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'file' => 'The uploaded ICO directory is invalid.',
            ]);
        }

        for ($index = 0; $index < $imageCount; $index++) {
            $entry = 6 + ($index * 16);
            $bytesInRes = unpack('Vbytes_in_res', substr($contents, $entry + 8, 4))['bytes_in_res'];
            $imageOffset = unpack('Vimage_offset', substr($contents, $entry + 12, 4))['image_offset'];

            if ($bytesInRes <= 0 || $imageOffset < $directoryEnd || $imageOffset >= $fileSize || $imageOffset + $bytesInRes > $fileSize) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'file' => 'The uploaded ICO image payload is out of bounds.',
                ]);
            }
        }
    }

    /**
     * List all media files
     */
    public function index(Request $request)
    {
        $query = Media::orderBy('created_at', 'desc');

        if ($request->filled('folder')) {
            $query->where('folder', $request->folder);
        }

        if ($request->filled('search')) {
            $query->where('original_name', 'like', '%' . $request->search . '%');
        }

        if ($request->filled('mime_type')) {
            $query->where('mime_type', 'like', $request->mime_type . '%');
        }

        $perPage = $request->get('per_page', 30);
        return response()->json($query->paginate($perPage));
    }

    /**
     * Upload file and convert to WebP
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:10240', // max 10MB
            'folder' => 'nullable|string',
            'alt' => 'nullable|string',
            'caption' => 'nullable|string|max:1000',
        ]);

        // Tăng memory limit cho xử lý ảnh
        ini_set('memory_limit', '512M');

        $file = $request->file('file');
        $folder = $request->get('folder', 'general');
        $originalName = $file->getClientOriginalName();
        $mimeType = $file->getMimeType();
        $ext = strtolower($file->getClientOriginalExtension());

        // ICO files must keep their original bytes: Intervention cannot safely
        // transcode them and browsers require the ICO header to remain intact.
        $isIco = $ext === 'ico';
        if ($isIco) {
            $this->validateIcoFile($file);
            $mimeType = 'image/x-icon';
        }

        // Generate unique filename
        $baseName = pathinfo($originalName, PATHINFO_FILENAME);
        // Sanitize baseName - loại bỏ ký tự đặc biệt
        $baseName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $baseName);
        $timestamp = time();
        $month = date('Y-m');

        // Create directory if not exists
        $dir = storage_path("app/public/uploads/{$month}");
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        // Xác định loại file
        $isImage = str_starts_with($mimeType, 'image/');
        $isWebP = ($mimeType === 'image/webp' || $ext === 'webp');
        $skipConvert = $isIco || in_array($mimeType, ['image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']);

        if ($isImage && $isWebP) {
            // === WebP: Lưu trực tiếp, KHÔNG cần Intervention Image ===
            $webpFilename = "{$baseName}-{$timestamp}.webp";
            $relativePath = "uploads/{$month}/{$webpFilename}";

            $file->storeAs("uploads/{$month}", $webpFilename, 'public');

            $fullPath = storage_path("app/public/{$relativePath}");
            $url = "/storage/{$relativePath}";

            // Lấy kích thước bằng PHP native (nhẹ hơn Intervention)
            $width = null;
            $height = null;
            if (function_exists('getimagesize')) {
                $info = @getimagesize($fullPath);
                if ($info) {
                    $width = $info[0];
                    $height = $info[1];
                }
            }

            $media = Media::create([
                'filename' => $webpFilename,
                'original_name' => $originalName,
                'path' => $relativePath,
                'url' => $url,
                'mime_type' => 'image/webp',
                'size' => filesize($fullPath),
                'width' => $width,
                'height' => $height,
                'alt' => $request->get('alt', $baseName),
                'caption' => $request->get('caption'),
                'folder' => $folder,
            ]);
        } elseif ($isImage && !$skipConvert) {
            // === JPG/PNG/GIF/BMP → Convert sang WebP ===
            $webpFilename = "{$baseName}-{$timestamp}.webp";
            $relativePath = "uploads/{$month}/{$webpFilename}";
            $fullPath = storage_path("app/public/{$relativePath}");

            try {
                $image = Image::read($file);
                $width = $image->width();
                $height = $image->height();

                // Resize if too large (max 2000px)
                if ($width > 2000 || $height > 2000) {
                    $image->scaleDown(width: 2000, height: 2000);
                    $width = $image->width();
                    $height = $image->height();
                }

                $image->toWebp(85)->save($fullPath);

                $media = Media::create([
                    'filename' => $webpFilename,
                    'original_name' => $originalName,
                    'path' => $relativePath,
                    'url' => "/storage/{$relativePath}",
                    'mime_type' => 'image/webp',
                    'size' => filesize($fullPath),
                    'width' => $width,
                    'height' => $height,
                    'alt' => $request->get('alt', $baseName),
                    'caption' => $request->get('caption'),
                    'folder' => $folder,
                ]);
            } catch (\Throwable $e) {
                // Fallback: lưu file gốc nếu convert thất bại
                $origExt = $file->getClientOriginalExtension() ?: 'jpg';
                $newFilename = "{$baseName}-{$timestamp}.{$origExt}";
                $relativePath = "uploads/{$month}/{$newFilename}";

                $file->storeAs("uploads/{$month}", $newFilename, 'public');

                $width = null;
                $height = null;
                $storedPath = storage_path("app/public/{$relativePath}");
                if (function_exists('getimagesize') && file_exists($storedPath)) {
                    $info = @getimagesize($storedPath);
                    if ($info) { $width = $info[0]; $height = $info[1]; }
                }

                $media = Media::create([
                    'filename' => $newFilename,
                    'original_name' => $originalName,
                    'path' => $relativePath,
                    'url' => "/storage/{$relativePath}",
                    'mime_type' => $mimeType,
                    'size' => $file->getSize(),
                    'width' => $width,
                    'height' => $height,
                    'alt' => $request->get('alt', $baseName),
                    'caption' => $request->get('caption'),
                    'folder' => $folder,
                ]);
            }
        } else {
            // === Non-image files (SVG, ICO, PDF, etc.) → Lưu nguyên ===
            $fileExt = $isIco ? 'ico' : $file->getClientOriginalExtension();
            $newFilename = "{$baseName}-{$timestamp}.{$fileExt}";
            $relativePath = "uploads/{$month}/{$newFilename}";

            $file->storeAs("uploads/{$month}", $newFilename, 'public');

            $media = Media::create([
                'filename' => $newFilename,
                'original_name' => $originalName,
                'path' => $relativePath,
                'url' => "/storage/{$relativePath}",
                'mime_type' => $mimeType,
                'size' => $file->getSize(),
                'alt' => $request->get('alt', $baseName),
                'caption' => $request->get('caption'),
                'folder' => $folder,
            ]);
        }

        return response()->json($media, 201);
    }

    /**
     * Delete media
     */
    public function destroy(Media $media)
    {
        // Delete file from storage
        $fullPath = storage_path("app/public/{$media->path}");
        if (file_exists($fullPath)) {
            unlink($fullPath);
        }

        $media->delete();

        return response()->json(['message' => 'Xóa media thành công']);
    }

    /**
     * Update media alt text
     */
    public function update(Request $request, Media $media)
    {
        $data = $request->validate([
            'alt' => 'nullable|string|max:255',
            'caption' => 'nullable|string|max:1000',
            'folder' => 'nullable|string|max:100',
        ]);

        $media->update($data);

        return response()->json($media);
    }
}
