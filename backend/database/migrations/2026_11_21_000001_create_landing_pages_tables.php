<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_pages', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('headline')->nullable();
            $table->string('subheadline', 500)->nullable();
            $table->string('hero_image')->nullable();
            $table->string('cta_text', 100)->nullable();
            $table->string('promo_text')->nullable();
            $table->timestamp('promo_ends_at')->nullable();
            $table->json('benefits')->nullable();
            $table->json('testimonials')->nullable();
            $table->json('faqs')->nullable();
            $table->string('fb_pixel_id', 40)->nullable();
            $table->string('tiktok_pixel_id', 40)->nullable();
            $table->string('google_ads_id', 40)->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });

        Schema::create('landing_page_product', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landing_page_id')->constrained('landing_pages')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->integer('order')->default(0);
            $table->timestamps();
            $table->unique(['landing_page_id', 'product_id']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('source', 100)->nullable()->after('note');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('source');
        });
        Schema::dropIfExists('landing_page_product');
        Schema::dropIfExists('landing_pages');
    }
};
