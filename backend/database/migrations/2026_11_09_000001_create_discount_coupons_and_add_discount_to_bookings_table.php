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
        Schema::create('discount_coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->enum('type', ['percentage', 'fixed'])->default('percentage');
            $table->decimal('value', 15, 2);
            $table->decimal('min_spend', 15, 2)->default(0);
            $table->decimal('max_discount', 15, 2)->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('used_count')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['code', 'is_active']);
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->foreignId('discount_coupon_id')->nullable()->after('room_type_id')->constrained('discount_coupons')->nullOnDelete();
            $table->string('discount_code', 50)->nullable()->after('total_extras_amount');
            $table->decimal('discount_amount', 15, 2)->default(0)->after('discount_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['discount_coupon_id']);
            $table->dropColumn(['discount_coupon_id', 'discount_code', 'discount_amount']);
        });

        Schema::dropIfExists('discount_coupons');
    }
};

