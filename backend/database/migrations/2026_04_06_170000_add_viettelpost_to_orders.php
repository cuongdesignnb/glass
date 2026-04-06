<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('vtp_order_number', 50)->nullable()->after('order_number')->comment('Mã vận đơn Viettel Post');
            $table->integer('vtp_status_code')->nullable()->after('status')->comment('Mã trạng thái VTP');
            $table->string('vtp_status_name', 255)->nullable()->after('vtp_status_code')->comment('Tên trạng thái VTP');
            $table->timestamp('vtp_status_date')->nullable()->after('vtp_status_name');
            $table->string('vtp_service', 20)->nullable()->after('vtp_status_date')->comment('Dịch vụ VTP: VCN, VCBO, ...');
            $table->decimal('vtp_shipping_fee', 12, 0)->nullable()->after('vtp_service')->comment('Phí ship thực tế từ VTP');
            $table->text('vtp_tracking_log')->nullable()->after('vtp_shipping_fee')->comment('Log hành trình JSON');

            // Lưu thêm mã địa chỉ để gửi VTP API
            $table->integer('city_id')->nullable()->after('city')->comment('Province ID VTP');
            $table->integer('district_id')->nullable()->after('district')->comment('District ID VTP');
            $table->integer('ward_id')->nullable()->after('ward')->comment('Wards ID VTP');

            $table->index('vtp_order_number');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['vtp_order_number']);
            $table->dropColumn([
                'vtp_order_number',
                'vtp_status_code',
                'vtp_status_name',
                'vtp_status_date',
                'vtp_service',
                'vtp_shipping_fee',
                'vtp_tracking_log',
                'city_id',
                'district_id',
                'ward_id',
            ]);
        });
    }
};
