<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_attributes', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // gender, face_shape, frame_style, material, color
            $table->string('value');  // Value used for filtering (e.g. 'nam', 'tron', 'cat-eye')
            $table->string('label');  // Display label (e.g. 'Nam', 'Tròn', 'Cat-Eye')
            $table->string('extra')->nullable(); // For colors: hex code; for others: icon, etc.
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['type', 'value']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_attributes');
    }
};
