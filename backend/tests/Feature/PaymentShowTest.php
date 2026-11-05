<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesPendingPayment;
use Tests\TestCase;

/**
 * GET /api/v1/payments/{id}
 *
 * Regression test: this endpoint used to return 500 because it eager loaded
 * the removed relations "booking.service" and "booking.slot".
 */
class PaymentShowTest extends TestCase
{
    use CreatesPendingPayment;
    use RefreshDatabase;

    private function asUser(User $user): static
    {
        return $this->withHeader('Authorization', 'Bearer ' . $user->createToken('test')->plainTextToken);
    }

    public function test_owner_can_view_payment_with_room_type_and_logs(): void
    {
        $owner = User::factory()->create(['role' => 'customer']);
        $payment = $this->createPendingPayment($owner);

        $this->asUser($owner)
            ->getJson("/api/v1/payments/{$payment->id}")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $payment->id)
            ->assertJsonPath('data.order_id', $payment->order_id)
            ->assertJsonPath('data.booking.booking_code', $payment->booking->booking_code)
            ->assertJsonPath('data.booking.room_type.name', 'Deluxe Suite')
            ->assertJsonStructure(['data' => ['booking' => ['extra_items'], 'logs']]);
    }

    public function test_another_customer_cannot_view_the_payment(): void
    {
        $payment = $this->createPendingPayment(User::factory()->create(['role' => 'customer']));
        $stranger = User::factory()->create(['role' => 'customer']);

        $this->asUser($stranger)
            ->getJson("/api/v1/payments/{$payment->id}")
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_admin_can_view_any_payment(): void
    {
        $payment = $this->createPendingPayment(User::factory()->create(['role' => 'customer']));
        $admin = User::factory()->create(['role' => 'admin']);

        $this->asUser($admin)
            ->getJson("/api/v1/payments/{$payment->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $payment->id);
    }

    public function test_admin_can_list_payments_and_filter_by_status(): void
    {
        $payment = $this->createPendingPayment(User::factory()->create(['role' => 'customer']));
        $admin = User::factory()->create(['role' => 'admin']);

        $this->asUser($admin)
            ->getJson('/api/v1/admin/payments')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.data.0.order_id', $payment->order_id)
            ->assertJsonPath('data.data.0.booking.room_type.name', 'Deluxe Suite');

        $this->asUser($admin)
            ->getJson('/api/v1/admin/payments?status=PAID')
            ->assertOk()
            ->assertJsonCount(0, 'data.data');
    }

    public function test_customer_cannot_list_all_payments(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $this->asUser($customer)->getJson('/api/v1/admin/payments')->assertForbidden();
    }

    public function test_guest_cannot_view_a_payment(): void
    {
        $payment = $this->createPendingPayment();

        $this->getJson("/api/v1/payments/{$payment->id}")->assertUnauthorized();
    }

    public function test_unknown_payment_returns_404(): void
    {
        $user = User::factory()->create(['role' => 'customer']);

        $this->asUser($user)->getJson('/api/v1/payments/999999')->assertNotFound();
    }
}
