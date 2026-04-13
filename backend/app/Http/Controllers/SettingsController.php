<?php

namespace App\Http\Controllers;

use App\Models\UserSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /** GET /api/settings */
    public function show(Request $request): JsonResponse
    {
        $user     = $request->user();
        $settings = $user->settings ?? UserSetting::create(['user_id' => $user->id]);

        return response()->json($this->format($user, $settings));
    }

    /** PUT /api/settings */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'unit'                  => 'sometimes|in:kg,lb',
            'privacy'               => 'sometimes|in:friends,public,private',
            'shared_exercise_slugs' => 'sometimes|array',
            'username'              => 'sometimes|string|max:64',
        ]);

        $settings = $user->settings ?? UserSetting::create(['user_id' => $user->id]);

        $settingsData = array_intersect_key($data, array_flip(['unit', 'privacy', 'shared_exercise_slugs']));
        if ($settingsData) $settings->update($settingsData);

        if (isset($data['username'])) {
            $user->update(['name' => $data['username']]);
        }

        return response()->json($this->format($user->fresh(), $settings->fresh()));
    }

    private function format($user, $settings): array
    {
        return [
            'unit'             => $settings->unit ?? 'kg',
            'username'         => $user->name,
            'userId'           => (string) $user->id,
            'privacy'          => $settings->privacy ?? 'friends',
            'sharedExercises'  => $settings->shared_exercise_slugs ?? [],
        ];
    }
}
