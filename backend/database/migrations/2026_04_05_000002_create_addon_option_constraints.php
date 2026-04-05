<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Create addon option constraints table.
 * When option A is selected, option B becomes disabled.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('addon_option_constraints')) {
            Schema::create('addon_option_constraints', function (Blueprint $table) {
                $table->id();
                $table->foreignId('option_id')
                    ->constrained('product_addon_options')
                    ->cascadeOnDelete();
                $table->foreignId('blocked_option_id')
                    ->constrained('product_addon_options')
                    ->cascadeOnDelete();
                $table->unique(['option_id', 'blocked_option_id']);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('addon_option_constraints');
    }
};
