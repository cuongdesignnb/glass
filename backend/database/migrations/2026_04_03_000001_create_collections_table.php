<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('collections', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->string('tag')->nullable();           // CLASSIC, SPORT, RETRO...
            $table->string('variant')->nullable();        // classic, sport, vintage...
            $table->string('size')->default('normal');     // normal, tall, wide
            $table->string('image')->nullable();           // optional banner image
            $table->string('gradient_from')->nullable();   // hex color
            $table->string('gradient_to')->nullable();     // hex color
            $table->string('accent_color')->nullable();    // hex for tag/cta
            $table->integer('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collections');
    }
};
