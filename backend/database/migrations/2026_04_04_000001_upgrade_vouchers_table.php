<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            $table->enum('scope', ['all', 'product', 'user'])->default('all')->after('type');
            $table->decimal('max_discount', 12, 0)->nullable()->after('min_order');
            $table->string('description')->nullable()->after('code');
            $table->integer('per_user_limit')->default(1)->after('max_uses');
        });

        Schema::create('voucher_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voucher_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->unique(['voucher_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voucher_products');
        Schema::table('vouchers', function (Blueprint $table) {
            $table->dropColumn(['scope', 'max_discount', 'description', 'per_user_limit']);
        });
    }
};
