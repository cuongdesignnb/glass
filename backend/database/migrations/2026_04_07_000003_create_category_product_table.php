<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('category_product', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->foreignId('category_id')->constrained()->onDelete('cascade');
            $table->unique(['product_id', 'category_id']);
        });

        // Migrate existing category_id data to pivot table
        $products = \DB::table('products')->whereNotNull('category_id')->get();
        foreach ($products as $product) {
            \DB::table('category_product')->insert([
                'product_id' => $product->id,
                'category_id' => $product->category_id,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('category_product');
    }
};
