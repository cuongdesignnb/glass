<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->text('caption')->nullable()->after('alt');
        });

        Schema::table('articles', function (Blueprint $table) {
            $table->string('thumbnail_alt')->nullable()->after('thumbnail');
            $table->text('thumbnail_caption')->nullable()->after('thumbnail_alt');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->string('thumbnail_alt')->nullable()->after('thumbnail');
            $table->text('thumbnail_caption')->nullable()->after('thumbnail_alt');
            $table->json('image_alts')->nullable()->after('thumbnail_caption');
            $table->json('image_captions')->nullable()->after('image_alts');
        });

        DB::table('articles')
            ->whereNotNull('thumbnail')
            ->where('thumbnail', '!=', '')
            ->whereNull('thumbnail_alt')
            ->update(['thumbnail_alt' => DB::raw('title')]);

        DB::table('products')
            ->whereNotNull('thumbnail')
            ->where('thumbnail', '!=', '')
            ->whereNull('thumbnail_alt')
            ->update(['thumbnail_alt' => DB::raw('name')]);
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['thumbnail_alt', 'thumbnail_caption', 'image_alts', 'image_captions']);
        });

        Schema::table('articles', function (Blueprint $table) {
            $table->dropColumn(['thumbnail_alt', 'thumbnail_caption']);
        });

        Schema::table('media', function (Blueprint $table) {
            $table->dropColumn('caption');
        });
    }
};
