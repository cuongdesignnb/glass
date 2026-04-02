<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Mở rộng users table
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->after('email');
            $table->string('province')->nullable()->after('phone');
            $table->string('ward')->nullable()->after('province');
            $table->text('address_detail')->nullable()->after('ward');
            $table->integer('points')->default(0)->after('address_detail');
            $table->bigInteger('total_spent')->default(0)->after('points');
            $table->boolean('is_active')->default(true)->after('total_spent');
        });

        // Đổi default role từ 'admin' sang 'customer'
        // (admin accounts đã tạo rồi nên không ảnh hưởng)

        // Loyalty transactions
        Schema::create('loyalty_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('order_id')->nullable()->constrained()->onDelete('set null');
            $table->enum('type', ['earn', 'redeem', 'admin_add', 'admin_subtract', 'register_bonus']);
            $table->integer('points');
            $table->string('description')->nullable();
            $table->timestamps();
            $table->index('user_id');
        });

        // Vouchers
        Schema::create('vouchers', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->enum('type', ['percent', 'fixed']);
            $table->decimal('value', 12, 0)->default(0);
            $table->decimal('min_order', 12, 0)->default(0);
            $table->integer('max_uses')->default(1);
            $table->integer('used_count')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Notifications
        Schema::create('notifications_custom', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('content');
            $table->enum('type', ['info', 'promo', 'order', 'system'])->default('info');
            $table->enum('target_type', ['all', 'group', 'individual'])->default('all');
            $table->string('target_group')->nullable();
            $table->json('target_user_ids')->nullable();
            $table->foreignId('sender_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });

        // Notification reads
        Schema::create('notification_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('notification_id')->constrained('notifications_custom')->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->timestamp('read_at')->nullable();
            $table->unique(['notification_id', 'user_id']);
        });

        // Add user_id to orders (link đơn hàng với user đăng nhập)
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->onDelete('set null');
            $table->string('voucher_code')->nullable()->after('discount');
            $table->integer('points_used')->default(0)->after('voucher_code');
            $table->decimal('points_discount', 12, 0)->default(0)->after('points_used');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn(['user_id', 'voucher_code', 'points_used', 'points_discount']);
        });
        Schema::dropIfExists('notification_reads');
        Schema::dropIfExists('notifications_custom');
        Schema::dropIfExists('vouchers');
        Schema::dropIfExists('loyalty_transactions');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'province', 'ward', 'address_detail', 'points', 'total_spent', 'is_active']);
        });
    }
};
