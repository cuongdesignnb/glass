<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('addon_price_sync_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('option_id');
            $table->decimal('old_price', 15, 2)->nullable();
            $table->decimal('new_price', 15, 2);
            $table->boolean('is_available')->default(true);
            $table->integer('affected_count')->default(0);
            $table->longText('snapshot'); // Stores JSON snapshot of original prices before update
            $table->timestamp('reverted_at')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('option_id')->references('id')->on('product_addon_options')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('addon_price_sync_logs');
    }
};
