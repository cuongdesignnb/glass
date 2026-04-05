<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add product_id to constraints for per-product overrides.
 * - product_id = NULL → global constraint (default for all products)
 * - product_id = X → only applies to product X
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('addon_option_constraints') && !Schema::hasColumn('addon_option_constraints', 'product_id')) {
            Schema::table('addon_option_constraints', function (Blueprint $table) {
                $table->unsignedBigInteger('product_id')->nullable()->after('id');
                $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();

                // Drop old unique and add new one with product_id
                try {
                    $table->dropUnique(['option_id', 'blocked_option_id']);
                } catch (\Exception $e) {}
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
