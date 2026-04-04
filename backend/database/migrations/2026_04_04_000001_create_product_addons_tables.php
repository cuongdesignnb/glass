<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Global Addon Groups (templates - name only)
        if (!Schema::hasTable('product_addon_groups')) {
            Schema::create('product_addon_groups', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->boolean('is_required')->default(false);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });
        }

        // Global Addon Options (name only, NO price)
        if (!Schema::hasTable('product_addon_options')) {
            Schema::create('product_addon_options', function (Blueprint $table) {
                $table->id();
                $table->foreignId('group_id')->constrained('product_addon_groups')->cascadeOnDelete();
                $table->string('name');
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });
        }

        // Pivot: which groups apply to which products
        if (!Schema::hasTable('product_addon_group_product')) {
            Schema::create('product_addon_group_product', function (Blueprint $table) {
                $table->foreignId('product_id')->constrained()->cascadeOnDelete();
                $table->foreignId('group_id')->constrained('product_addon_groups')->cascadeOnDelete();
                $table->primary(['product_id', 'group_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('product_addon_group_product');
        Schema::dropIfExists('product_addon_options');
        Schema::dropIfExists('product_addon_groups');
    }
};
