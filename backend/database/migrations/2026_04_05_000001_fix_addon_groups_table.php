<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fix: product_addon_groups should NOT have product_id column.
 * Products are linked via pivot table product_addon_group_product.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Remove product_id from addon groups if it exists (leftover from old schema)
        if (Schema::hasTable('product_addon_groups') && Schema::hasColumn('product_addon_groups', 'product_id')) {
            Schema::table('product_addon_groups', function (Blueprint $table) {
                // Drop foreign key first if exists
                try {
                    $table->dropForeign(['product_id']);
                } catch (\Exception $e) {
                    // Foreign key may not exist
                }
                $table->dropColumn('product_id');
            });
        }

        // Ensure pivot table exists
        if (!Schema::hasTable('product_addon_group_product')) {
            Schema::create('product_addon_group_product', function (Blueprint $table) {
                $table->foreignId('product_id')->constrained()->cascadeOnDelete();
                $table->foreignId('group_id')->constrained('product_addon_groups')->cascadeOnDelete();
                $table->primary(['product_id', 'group_id']);
            });
        }

        // Ensure addon prices table exists
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
        // No rollback needed
    }
};
