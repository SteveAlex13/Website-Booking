<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        // super_admin always has access to all admin routes
        if ($user->role === 'super_admin') {
            return $next($request);
        }

        // Flatten/split roles in case passed as comma-separated string
        $allowedRoles = [];
        foreach ($roles as $r) {
            foreach (explode(',', $r) as $subRole) {
                $trimmed = trim($subRole);
                if ($trimmed !== '') {
                    $allowedRoles[] = $trimmed;
                }
            }
        }

        if (! in_array($user->role, $allowedRoles)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden. Akses ditolak.',
            ], 403);
        }

        return $next($request);
    }
}

