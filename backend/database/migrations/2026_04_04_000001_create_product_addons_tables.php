<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Addon Groups: e.g. "Chọn Gọng Kính", "Chọn Độ Cận", "Chọn Chất Liệu Tròng"
        Schema::create('product_addon_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('name');           // e.g. "Chất liệu tròng"
            $table->boolean('is_required')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Addon Options: items within each group
        Schema::create('product_addon_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained('product_addon_groups')->cascadeOnDelete();
            $table->string('name');           // e.g. "Tròng cắt thuỷ tinh"
            $table->decimal('additional_price', 12, 0)->default(0); // +0 = free, +price
            $table->boolean('is_default')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_addon_options');
        Schema::dropIfExists('product_addon_groups');
    }
};
