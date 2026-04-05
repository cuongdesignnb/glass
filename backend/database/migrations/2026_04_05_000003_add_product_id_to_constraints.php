<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Add product_id to constraints for per-product overrides.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('addon_option_constraints') && !Schema::hasColumn('addon_option_constraints', 'product_id')) {
            // Step 1: Add product_id column
            Schema::table('addon_option_constraints', function (Blueprint $table) {
                $table->unsignedBigInteger('product_id')->nullable()->after('id');
            });

            // Step 2: Drop old unique index safely (must drop foreign keys first on MySQL)
            try {
                // Get all foreign keys and drop them
                Schema::table('addon_option_constraints', function (Blueprint $table) {
                    try { $table->dropForeign(['option_id']); } catch (\Exception $e) {}
                    try { $table->dropForeign(['blocked_option_id']); } catch (\Exception $e) {}
                });

                // Now drop the unique index
                Schema::table('addon_option_constraints', function (Blueprint $table) {
                    try { $table->dropUnique(['option_id', 'blocked_option_id']); } catch (\Exception $e) {}
                });
            } catch (\Exception $e) {
                // Index may not exist
            }

            // Step 3: Re-add foreign keys + new unique with product_id
            Schema::table('addon_option_constraints', function (Blueprint $table) {
                $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
                $table->foreign('option_id')->references('id')->on('product_addon_options')->cascadeOnDelete();
                $table->foreign('blocked_option_id')->references('id')->on('product_addon_options')->cascadeOnDelete();
                $table->unique(['product_id', 'option_id', 'blocked_option_id'], 'constraint_unique');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('addon_option_constraints') && Schema::hasColumn('addon_option_constraints', 'product_id')) {
            Schema::table('addon_option_constraints', function (Blueprint $table) {
                try { $table->dropUnique('constraint_unique'); } catch (\Exception $e) {}
                try { $table->dropForeign(['product_id']); } catch (\Exception $e) {}
                $table->dropColumn('product_id');
            });
        }
    }
};
