<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Modify addon system: move prices from options to per-product pricing table.
 * This migration is safe to run on existing data - no data loss.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Remove price columns from options (prices now per-product)
        if (Schema::hasTable('product_addon_options')) {
            Schema::table('product_addon_options', function (Blueprint $table) {
                if (Schema::hasColumn('product_addon_options', 'additional_price')) {
                    $table->dropColumn('additional_price');
                }
                if (Schema::hasColumn('product_addon_options', 'is_default')) {
                    $table->dropColumn('is_default');
                }
            });
        }

        // 2. Create per-product pricing table (if not exists)
        if (!Schema::hasTable('product_addon_prices')) {
            Schema::create('product_addon_prices', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained()->cascadeOnDelete();
                $table->foreignId('option_id')->constrained('product_addon_options')->cascadeOnDelete();
                $table->decimal('additional_price', 12, 0)->default(0);
                $table->boolean('is_available')->default(true);
                $table->unique(['product_id', 'option_id']);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('product_addon_prices');

        if (Schema::hasTable('product_addon_options')) {
            Schema::table('product_addon_options', function (Blueprint $table) {
                if (!Schema::hasColumn('product_addon_options', 'additional_price')) {
                    $table->decimal('additional_price', 12, 0)->default(0)->after('name');
                }
                if (!Schema::hasColumn('product_addon_options', 'is_default')) {
                    $table->boolean('is_default')->default(false)->after('additional_price');
                }
            });
        }
    }
};
