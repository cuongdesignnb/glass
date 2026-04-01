<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Bảng lưu log giao dịch SePay webhook
        Schema::create('sepay_transactions', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('sepay_id')->unique()->comment('ID giao dịch từ SePay');
            $table->string('gateway')->comment('Ngân hàng: Vietcombank, MBBank...');
            $table->timestamp('transaction_date')->nullable();
            $table->string('account_number')->nullable()->comment('Số tài khoản nhận tiền');
            $table->string('sub_account')->nullable()->comment('Tài khoản ảo VA');
            $table->decimal('amount_in', 15, 0)->default(0)->comment('Số tiền vào');
            $table->decimal('amount_out', 15, 0)->default(0)->comment('Số tiền ra');
            $table->decimal('accumulated', 15, 0)->default(0)->comment('Số dư lũy kế');
            $table->string('code')->nullable()->comment('Mã đơn hàng trong nội dung CK');
            $table->text('content')->nullable()->comment('Nội dung chuyển khoản');
            $table->string('reference_code')->nullable()->comment('Mã tham chiếu ngân hàng');
            $table->json('raw_body')->nullable()->comment('Toàn bộ JSON gốc từ SePay');
            $table->boolean('processed')->default(false)->comment('Đã xử lý đơn hàng chưa');
            $table->unsignedBigInteger('order_id')->nullable()->comment('Đơn hàng được thanh toán');
            $table->text('process_note')->nullable()->comment('Ghi chú xử lý');
            $table->timestamps();

            $table->index(['code', 'processed']);
            $table->index('order_id');
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('set null');
        });

        // Thêm cột payment_code vào orders (mã dùng trong nội dung CK)
        if (!Schema::hasColumn('orders', 'payment_code')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->string('payment_code')->nullable()->unique()->after('order_number')
                    ->comment('Mã thanh toán điền vào nội dung CK');
                $table->string('payment_status')->default('unpaid')->change();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('sepay_transactions');
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('payment_code');
        });
    }
};
