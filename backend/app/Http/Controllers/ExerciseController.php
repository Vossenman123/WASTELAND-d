<?php

namespace App\Http\Controllers;

use App\Models\Exercise;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExerciseController extends Controller
{
    /** GET /api/exercises */
    public function index(Request $request): JsonResponse
    {
        $exercises = Exercise::where(function ($q) use ($request) {
            $q->where('user_id', $request->user()->id)
              ->orWhere('is_builtin', true);
        })->get();

        return response()->json($exercises->map(fn ($e) => $this->format($e)));
    }

    /** POST /api/exercises */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'slug'        => 'required|string|max:64',
            'name'        => 'required|string|max:128',
            'category'    => 'nullable|string|max:64',
            'type'        => 'nullable|in:weight,time',
            'description' => 'nullable|string|max:512',
        ]);

        $exercise = Exercise::create([
            ...$data,
            'user_id'    => $request->user()->id,
            'is_builtin' => false,
        ]);

        return response()->json($this->format($exercise), 201);
    }

    /** PUT /api/exercises/{slug} */
    public function update(Request $request, string $slug): JsonResponse
    {
        $exercise = Exercise::where('slug', $slug)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $data = $request->validate([
            'name'        => 'sometimes|string|max:128',
            'category'    => 'sometimes|string|max:64',
            'type'        => 'sometimes|in:weight,time',
            'description' => 'nullable|string|max:512',
        ]);

        $exercise->update($data);

        return response()->json($this->format($exercise));
    }

    /** DELETE /api/exercises/{slug} */
    public function destroy(Request $request, string $slug): JsonResponse
    {
        Exercise::where('slug', $slug)
            ->where('user_id', $request->user()->id)
            ->firstOrFail()
            ->delete();

        return response()->json(null, 204);
    }

    private function format(Exercise $e): array
    {
        return [
            'id'          => $e->slug,
            'name'        => $e->name,
            'cat'         => $e->category,
            'type'        => $e->type ?? 'weight',
            'desc'        => $e->description,
            'is_builtin'  => $e->is_builtin,
        ];
    }
}
