<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('collection_product')) {
            Schema::create('collection_product', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('collection_id');
                $table->unsignedBigInteger('product_id');
                $table->integer('order')->default(0);
                $table->timestamps();

                $table->foreign('collection_id')->references('id')->on('collections')->onDelete('cascade');
                $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
                $table->unique(['collection_id', 'product_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('collection_product');
    }
};
