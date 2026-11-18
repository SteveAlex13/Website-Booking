<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Super admin user management: list, create staff, edit, activate and deactivate.
 */
class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private User $staff;
    private User $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdmin = User::factory()->create(['role' => 'super_admin', 'name' => 'General Manager', 'email' => 'gm@hotel.com', 'cancellation_key' => 'SECRET-KEY']);
        $this->staff = User::factory()->create(['role' => 'admin', 'name' => 'Front Desk Rina', 'email' => 'rina@hotel.com']);
        $this->customer = User::factory()->create(['role' => 'customer', 'name' => 'Budi Tamu', 'email' => 'budi@example.com']);
    }

    private function login(string $email, string $password = 'password')
    {
        return $this->postJson('/api/v1/login', ['email' => $email, 'password' => $password]);
    }

    // ---------- Access ----------

    public function test_only_super_admin_can_manage_users(): void
    {
        $this->actingAs($this->staff)->getJson('/api/v1/admin/users')->assertForbidden();
        $this->actingAs($this->staff)->postJson('/api/v1/admin/users', [])->assertForbidden();
        $this->actingAs($this->staff)->putJson("/api/v1/admin/users/{$this->customer->id}", [])->assertForbidden();
        $this->actingAs($this->staff)->patchJson("/api/v1/admin/users/{$this->customer->id}/toggle-active")->assertForbidden();

        $this->actingAs($this->customer)->getJson('/api/v1/admin/users')->assertForbidden();

        $this->actingAs($this->superAdmin)->getJson('/api/v1/admin/users')->assertOk();
    }

    // ---------- List ----------

    public function test_list_supports_search_role_and_status_filters(): void
    {
        $this->actingAs($this->superAdmin);

        $this->getJson('/api/v1/admin/users')->assertOk()->assertJsonPath('data.total', 3);
        $this->getJson('/api/v1/admin/users?search=budi')->assertJsonPath('data.total', 1);
        $this->getJson('/api/v1/admin/users?role=admin')->assertJsonPath('data.total', 1);
        $this->getJson('/api/v1/admin/users?status=inactive')->assertJsonPath('data.total', 0);

        $this->customer->update(['is_active' => false]);
        $this->getJson('/api/v1/admin/users?status=inactive')->assertJsonPath('data.total', 1);
        $this->getJson('/api/v1/admin/users?status=active')->assertJsonPath('data.total', 2);
    }

    public function test_list_never_exposes_passwords_or_the_cancellation_key(): void
    {
        $body = $this->actingAs($this->superAdmin)->getJson('/api/v1/admin/users')->assertOk()->getContent();

        $this->assertStringNotContainsString('SECRET-KEY', $body);
        $this->assertStringNotContainsString('cancellation_key', $body);
        $this->assertStringNotContainsString('"password"', $body);
    }

    // ---------- Create ----------

    public function test_super_admin_creates_a_front_desk_account_that_can_log_in(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/users', [
                'name' => 'Front Desk Baru',
                'email' => 'baru@hotel.com',
                'phone' => '0812345678',
                'role' => 'admin',
                'password' => 'rahasia123',
            ])
            ->assertCreated()
            ->assertJsonPath('data.role', 'admin')
            ->assertJsonPath('data.is_active', true);

        $this->login('baru@hotel.com', 'rahasia123')->assertOk()->assertJsonPath('data.user.role', 'admin');
    }

    public function test_create_validates_input(): void
    {
        $this->actingAs($this->superAdmin);

        // duplicate email
        $this->postJson('/api/v1/admin/users', ['name' => 'X', 'email' => 'budi@example.com', 'role' => 'admin', 'password' => 'rahasia123'])
            ->assertStatus(422);
        // only staff roles can be created here
        $this->postJson('/api/v1/admin/users', ['name' => 'X', 'email' => 'x@hotel.com', 'role' => 'customer', 'password' => 'rahasia123'])
            ->assertStatus(422);
        // short password
        $this->postJson('/api/v1/admin/users', ['name' => 'X', 'email' => 'x@hotel.com', 'role' => 'admin', 'password' => 'short'])
            ->assertStatus(422);
    }

    // ---------- Update ----------

    public function test_super_admin_updates_name_phone_and_role(): void
    {
        $this->actingAs($this->superAdmin)
            ->putJson("/api/v1/admin/users/{$this->staff->id}", [
                'name' => 'Rina Super',
                'email' => $this->staff->email,
                'phone' => '0899',
                'role' => 'super_admin',
            ])
            ->assertOk()
            ->assertJsonPath('data.role', 'super_admin');

        $this->assertSame('Rina Super', $this->staff->fresh()->name);
    }

    public function test_changing_a_role_logs_the_user_out_and_clears_the_key_of_a_demoted_super_admin(): void
    {
        $other = User::factory()->create(['role' => 'super_admin', 'cancellation_key' => 'OTHER-KEY']);
        $other->createToken('t');

        $this->actingAs($this->superAdmin)
            ->putJson("/api/v1/admin/users/{$other->id}", [
                'name' => $other->name, 'email' => $other->email, 'role' => 'admin',
            ])
            ->assertOk();

        $this->assertNull($other->fresh()->cancellation_key);
        $this->assertSame(0, $other->tokens()->count());
    }

    public function test_cannot_change_your_own_role(): void
    {
        User::factory()->create(['role' => 'super_admin']); // a second super admin exists

        $this->actingAs($this->superAdmin)
            ->putJson("/api/v1/admin/users/{$this->superAdmin->id}", [
                'name' => $this->superAdmin->name, 'email' => $this->superAdmin->email, 'role' => 'admin',
            ])
            ->assertStatus(422);

        $this->assertSame('super_admin', $this->superAdmin->fresh()->role);
    }

    public function test_email_must_stay_unique_but_may_stay_unchanged(): void
    {
        $this->actingAs($this->superAdmin);

        $this->putJson("/api/v1/admin/users/{$this->customer->id}", [
            'name' => 'Budi Baru', 'email' => $this->customer->email, 'role' => 'customer',
        ])->assertOk();

        $this->putJson("/api/v1/admin/users/{$this->customer->id}", [
            'name' => 'Budi', 'email' => $this->staff->email, 'role' => 'customer',
        ])->assertStatus(422);
    }

    // ---------- Activate / deactivate ----------

    public function test_deactivated_user_cannot_log_in_and_is_logged_out(): void
    {
        $token = $this->customer->createToken('t')->plainTextToken;
        $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/v1/user')->assertOk();
        $this->app['auth']->forgetGuards();

        $this->actingAs($this->superAdmin)
            ->patchJson("/api/v1/admin/users/{$this->customer->id}/toggle-active")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->assertSame(0, $this->customer->tokens()->count());

        $this->login('budi@example.com')
            ->assertStatus(403)
            ->assertJsonPath('success', false);
    }

    public function test_reactivated_user_can_log_in_again(): void
    {
        $this->customer->update(['is_active' => false]);

        $this->actingAs($this->superAdmin)
            ->patchJson("/api/v1/admin/users/{$this->customer->id}/toggle-active")
            ->assertOk()
            ->assertJsonPath('data.is_active', true);

        $this->login('budi@example.com')->assertOk();
    }

    public function test_cannot_deactivate_yourself(): void
    {
        $this->actingAs($this->superAdmin)
            ->patchJson("/api/v1/admin/users/{$this->superAdmin->id}/toggle-active")
            ->assertStatus(422);

        $this->assertTrue($this->superAdmin->fresh()->is_active);
    }
}
