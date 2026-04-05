<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Add product_id to constraints for per-product overrides.
 * Uses raw SQL to avoid MySQL FK constraint issues.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('addon_option_constraints')) {
            return;
        }

        // Check if product_id already exists (partial migration may have added it)
        if (Schema::hasColumn('addon_option_constraints', 'product_id')) {
            return;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        // Add product_id column
        DB::statement('ALTER TABLE addon_option_constraints ADD COLUMN product_id BIGINT UNSIGNED NULL AFTER id');

        // Drop old unique index if exists
        try {
            DB::statement('ALTER TABLE addon_option_constraints DROP INDEX addon_option_constraints_option_id_blocked_option_id_unique');
        } catch (\Exception $e) {
            // Index may not exist
        }

        // Add new unique with product_id
        try {
            DB::statement('ALTER TABLE addon_option_constraints ADD UNIQUE KEY constraint_unique (product_id, option_id, blocked_option_id)');
        } catch (\Exception $e) {
            // May already exist
        }

        // Add FK for product_id
        try {
            DB::statement('ALTER TABLE addon_option_constraints ADD CONSTRAINT addon_constraints_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE');
        } catch (\Exception $e) {
            // May already exist
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    public function down(): void
    {
        if (!Schema::hasTable('addon_option_constraints') || !Schema::hasColumn('addon_option_constraints', 'product_id')) {
            return;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        try { DB::statement('ALTER TABLE addon_option_constraints DROP INDEX constraint_unique'); } catch (\Exception $e) {}
        try { DB::statement('ALTER TABLE addon_option_constraints DROP FOREIGN KEY addon_constraints_product_fk'); } catch (\Exception $e) {}
        try { DB::statement('ALTER TABLE addon_option_constraints DROP COLUMN product_id'); } catch (\Exception $e) {}
        try {
            DB::statement('ALTER TABLE addon_option_constraints ADD UNIQUE KEY addon_option_constraints_option_id_blocked_option_id_unique (option_id, blocked_option_id)');
        } catch (\Exception $e) {}

        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }
};
