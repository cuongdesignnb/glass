<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Convert gender from string to JSON array
        $products = \DB::table('products')->get();
        foreach ($products as $product) {
            $gender = $product->gender;
            // Skip if already JSON array
            if ($gender && !str_starts_with($gender, '[')) {
                \DB::table('products')
                    ->where('id', $product->id)
                    ->update(['gender' => json_encode([$gender])]);
            }
        }
    }

    public function down(): void
    {
        // Convert back to string
        $products = \DB::table('products')->get();
        foreach ($products as $product) {
            $gender = $product->gender;
            if ($gender && str_starts_with($gender, '[')) {
                $arr = json_decode($gender, true);
                \DB::table('products')
                    ->where('id', $product->id)
                    ->update(['gender' => $arr[0] ?? 'unisex']);
            }
        }
    }
};
