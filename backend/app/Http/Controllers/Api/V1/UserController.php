<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Super admin: manage accounts (guests, front desk, super admins).
 * Accounts are never deleted. They can be deactivated, which blocks login but keeps their data.
 */
class UserController extends Controller
{
    private const ROLES = ['customer', 'admin', 'super_admin'];

    /**
     * List users with search and filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::withCount('bookings');

        if ($request->filled('role') && in_array($request->role, self::ROLES, true)) {
            $query->where('role', $request->role);
        }

        if ($request->status === 'active') {
            $query->where('is_active', true);
        } elseif ($request->status === 'inactive') {
            $query->where('is_active', false);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('id', 'desc')
            ->paginate(15)
            ->through(fn (User $user) => $user->makeHidden('cancellation_key'));

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    /**
     * Create a staff account (front desk or super admin).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|string|email|max:150|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'role' => ['required', Rule::in(['admin', 'super_admin'])],
            'password' => 'required|string|min:8',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'role' => $validated['role'],
            'password' => $validated['password'],
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Akun {$user->name} berhasil dibuat.",
            'data' => $user->makeHidden('cancellation_key'),
        ], 201);
    }

    /**
     * Update name, email, phone and role.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => ['required', 'string', 'email', 'max:150', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => 'nullable|string|max:20',
            'role' => ['required', Rule::in(self::ROLES)],
        ]);

        $roleChanged = $validated['role'] !== $user->role;

        if ($roleChanged) {
            if ($user->id === $request->user()->id) {
                return $this->deny('Anda tidak bisa mengubah peran akun Anda sendiri.');
            }

            if ($user->role === 'super_admin' && $this->isLastActiveSuperAdmin($user)) {
                return $this->deny('Tidak bisa mengubah peran super admin aktif terakhir.');
            }
        }

        $user->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'role' => $validated['role'],
        ]);

        if ($roleChanged) {
            // The key only belongs to super admins
            if ($validated['role'] !== 'super_admin') {
                $user->cancellation_key = null;
            }
        }

        $user->save();

        if ($roleChanged) {
            // Force a new login so the new role takes effect everywhere
            $user->tokens()->delete();
        }

        return response()->json([
            'success' => true,
            'message' => "Data {$user->name} berhasil diperbarui.",
            'data' => $user->makeHidden('cancellation_key'),
        ]);
    }

    /**
     * Activate or deactivate an account.
     */
    public function toggleActive(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->id === $request->user()->id) {
            return $this->deny('Anda tidak bisa menonaktifkan akun Anda sendiri.');
        }

        if ($user->is_active && $user->role === 'super_admin' && $this->isLastActiveSuperAdmin($user)) {
            return $this->deny('Tidak bisa menonaktifkan super admin aktif terakhir.');
        }

        $user->is_active = ! $user->is_active;
        $user->save();

        if (! $user->is_active) {
            // Log the user out everywhere
            $user->tokens()->delete();
        }

        return response()->json([
            'success' => true,
            'message' => $user->is_active
                ? "Akun {$user->name} diaktifkan kembali."
                : "Akun {$user->name} dinonaktifkan.",
            'data' => $user->makeHidden('cancellation_key'),
        ]);
    }

    private function isLastActiveSuperAdmin(User $user): bool
    {
        return User::where('role', 'super_admin')
            ->where('is_active', true)
            ->where('id', '!=', $user->id)
            ->doesntExist();
    }

    private function deny(string $message): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
        ], 422);
    }
}
