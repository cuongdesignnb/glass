<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('image')->nullable();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->integer('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->string('meta_title')->nullable();
            $table->text('meta_desc')->nullable();
            $table->timestamps();

            $table->foreign('parent_id')->references('id')->on('categories')->onDelete('set null');
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('sku')->unique()->nullable();
            $table->text('description')->nullable();
            $table->longText('content')->nullable();
            $table->decimal('price', 15, 0);
            $table->decimal('sale_price', 15, 0)->nullable();
            $table->json('images')->nullable(); // array of image URLs
            $table->string('thumbnail')->nullable();

            // Filter attributes (JSON for flexibility)
            $table->json('colors')->nullable();       // [{value:"#000", name:"Đen"}]
            $table->json('color_names')->nullable();
            $table->json('prescription')->nullable();  // ["-0.25", "-0.50", ...]
            $table->string('gender')->default('unisex'); // nam, nu, unisex
            $table->json('face_shapes')->nullable();   // ["tron","vuong","oval"]
            $table->json('frame_styles')->nullable();  // ["aviator","cat-eye"]
            $table->json('materials')->nullable();     // ["titan","nhua"]

            // Product specs
            $table->string('brand')->nullable();
            $table->string('weight')->nullable();
            $table->string('frame_width')->nullable();
            $table->string('lens_width')->nullable();
            $table->string('lens_height')->nullable();
            $table->string('bridge_width')->nullable();
            $table->string('temple_length')->nullable();

            // Relations
            $table->unsignedBigInteger('category_id')->nullable();

            // SEO
            $table->string('meta_title')->nullable();
            $table->text('meta_desc')->nullable();
            $table->string('meta_keywords')->nullable();
            $table->string('og_image')->nullable();

            // Status
            $table->boolean('is_active')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_new')->default(false);
            $table->integer('stock')->default(0);
            $table->integer('sold')->default(0);
            $table->integer('views')->default(0);

            $table->timestamps();

            $table->foreign('category_id')->references('id')->on('categories')->onDelete('set null');
            $table->index(['is_active', 'is_featured']);
            $table->index('gender');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
        Schema::dropIfExists('categories');
    }
};
