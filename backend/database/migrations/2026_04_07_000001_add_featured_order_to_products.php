<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add featured_order to products
        if (Schema::hasTable('products') && !Schema::hasColumn('products', 'featured_order')) {
            Schema::table('products', function (Blueprint $table) {
                $table->integer('featured_order')->default(0)->after('is_new');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('products', 'featured_order')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('featured_order');
            });
        }
    }
};
