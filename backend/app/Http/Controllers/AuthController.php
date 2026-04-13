<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /** POST /api/register */
    public function register(Request $request): JsonResponse
    {
        $name  = trim((string) $request->input('name', ''));
        $email = mb_strtolower(trim((string) $request->input('email', '')));
        $request->merge([
            'name'  => $name,
            'email' => $email,
        ]);

        $validated = $request->validate([
            'name'                  => 'required|string|max:64',
            'email'                 => 'required|email|unique:users,email',
            'password'              => 'required|string|min:8|confirmed',
            'password_confirmation' => 'required|string',
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        UserSetting::create([
            'user_id' => $user->id,
            'unit'    => $request->input('unit', 'kg'),
        ]);

        $token = $user->createToken('gymlog')->plainTextToken;

        return response()->json([
            'user'  => $this->formatUser($user),
            'token' => $token,
        ], 201);
    }

    /** POST /api/login */
    public function login(Request $request): JsonResponse
    {
        $emailInput    = trim((string) $request->input('email', ''));
        $passwordInput = (string) $request->input('password', '');
        $request->merge([
            'email'    => $emailInput,
            'password' => $passwordInput,
        ]);

        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $emails = array_values(array_unique([$emailInput, mb_strtolower($emailInput)]));
        $passwords = array_values(array_unique([$passwordInput, trim($passwordInput)]));
        $authenticated = false;
        foreach ($emails as $email) {
            foreach ($passwords as $password) {
                if (Auth::attempt(['email' => $email, 'password' => $password])) {
                    $authenticated = true;
                    break 2;
                }
            }
        }

        if (! $authenticated) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        /** @var User $user */
        $user  = Auth::user();
        $token = $user->createToken('gymlog')->plainTextToken;

        return response()->json([
            'user'  => $this->formatUser($user),
            'token' => $token,
        ]);
    }

    /** POST /api/logout  (requires auth:sanctum) */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    /** GET /api/me  (requires auth:sanctum) */
    public function me(Request $request): JsonResponse
    {
        return response()->json($this->formatUser($request->user()));
    }

    private function formatUser(User $user): array
    {
        return [
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
        ];
    }
}
