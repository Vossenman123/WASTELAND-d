<?php

namespace App\Http\Controllers;

use App\Models\Workout;
use App\Models\WorkoutExercise;
use App\Models\WorkoutSet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkoutController extends Controller
{
    /** GET /api/workouts */
    public function index(Request $request): JsonResponse
    {
        $workouts = Workout::where('user_id', $request->user()->id)
            ->with('exercises.sets')
            ->orderBy('started_at', 'desc')
            ->get();

        return response()->json($workouts->map(fn ($w) => $this->format($w)));
    }

    /** GET /api/workouts/{slug} */
    public function show(Request $request, string $slug): JsonResponse
    {
        $workout = Workout::where('user_id', $request->user()->id)
            ->where('slug', $slug)
            ->with('exercises.sets')
            ->firstOrFail();

        return response()->json($this->format($workout));
    }

    /** POST /api/workouts  – stores a completed workout snapshot */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id'            => 'required|string|max:64',
            'templateName'  => 'nullable|string|max:128',
            'templateId'    => 'nullable|string|max:64',
            'notes'         => 'nullable|string|max:2048',
            'duration'      => 'nullable|integer',
            'date'          => 'required|string',
            'exercises'     => 'required|array',
            'exercises.*.exerciseId'     => 'required|string',
            'exercises.*.defaultRest'    => 'nullable|integer',
            'exercises.*.sets'           => 'required|array',
            'exercises.*.sets.*.weight'   => 'nullable|numeric',
            'exercises.*.sets.*.reps'     => 'nullable|integer',
            'exercises.*.sets.*.duration' => 'nullable|integer',
            'exercises.*.sets.*.completed'=> 'nullable|boolean',
        ]);

        $workout = Workout::create([
            'user_id'       => $request->user()->id,
            'slug'          => $data['id'],
            'template_name' => $data['templateName'] ?? null,
            'template_id'   => $data['templateId'] ?? null,
            'notes'         => $data['notes'] ?? null,
            'duration'      => $data['duration'] ?? 0,
            'started_at'    => $data['date'],
        ]);

        foreach ($data['exercises'] as $ei => $ex) {
            $we = WorkoutExercise::create([
                'workout_id'    => $workout->id,
                'exercise_slug' => $ex['exerciseId'],
                'sort_order'    => $ei,
                'default_rest'  => $ex['defaultRest'] ?? 90,
            ]);
            foreach ($ex['sets'] as $si => $set) {
                WorkoutSet::create([
                    'workout_exercise_id' => $we->id,
                    'set_number'          => $si + 1,
                    'weight'              => $set['weight'] ?? null,
                    'reps'                => $set['reps'] ?? null,
                    'duration'            => $set['duration'] ?? null,
                    'completed'           => $set['completed'] ?? false,
                ]);
            }
        }

        return response()->json($this->format($workout->load('exercises.sets')), 201);
    }

    /** DELETE /api/workouts/{slug} */
    public function destroy(Request $request, string $slug): JsonResponse
    {
        Workout::where('user_id', $request->user()->id)
            ->where('slug', $slug)
            ->firstOrFail()
            ->delete();

        return response()->json(null, 204);
    }

    private function format(Workout $w): array
    {
        return [
            'id'           => $w->slug,
            'templateName' => $w->template_name,
            'templateId'   => $w->template_id,
            'notes'        => $w->notes,
            'duration'     => $w->duration,
            'date'         => $w->started_at?->toIso8601String(),
            'exercises'    => $w->exercises->map(fn ($we) => [
                'exerciseId'  => $we->exercise_slug,
                'defaultRest' => $we->default_rest,
                'sets'        => $we->sets->map(fn ($s) => [
                    'weight'    => $s->weight,
                    'reps'      => $s->reps,
                    'duration'  => $s->duration,
                    'completed' => $s->completed,
                ])->values(),
            ])->values(),
        ];
    }
}
