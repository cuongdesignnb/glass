<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('landing_page_product', function (Blueprint $table) {
            // Landing-only prices set by an admin. NULL = use the catalogue price.
            $table->decimal('price_override', 12, 0)->nullable()->after('order');
            $table->decimal('sale_price_override', 12, 0)->nullable()->after('price_override');
        });
    }

    public function down(): void
    {
        Schema::table('landing_page_product', function (Blueprint $table) {
            $table->dropColumn(['price_override', 'sale_price_override']);
        });
    }
};
