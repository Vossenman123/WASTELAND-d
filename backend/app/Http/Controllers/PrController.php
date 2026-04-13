<?php

namespace App\Http\Controllers;

use App\Models\Workout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PrController extends Controller
{
    /** e1RM Epley formula */
    private static function epley(float $weight, int $reps): float
    {
        return $reps === 1 ? $weight : $weight * (1 + $reps / 30);
    }

    /** GET /api/prs – compute PRs from stored workouts */
    public function index(Request $request): JsonResponse
    {
        $workouts = Workout::where('user_id', $request->user()->id)
            ->with('exercises.sets')
            ->get();

        $prs = [];

        foreach ($workouts as $workout) {
            foreach ($workout->exercises as $we) {
                $exId = $we->exercise_slug;
                if (!isset($prs[$exId])) $prs[$exId] = [];

                $date = $workout->started_at?->toIso8601String();
                $wid  = $workout->slug;

                // Time-based sets
                $timeSets = $we->sets->filter(fn ($s) => $s->completed && $s->duration > 0);
                foreach ($timeSets as $s) {
                    if (empty($prs[$exId]['duration']) || $s->duration > $prs[$exId]['duration']['value']) {
                        $prs[$exId]['duration'] = ['value' => $s->duration, 'date' => $date, 'workoutId' => $wid];
                    }
                }

                // Weight-based sets
                $weightSets = $we->sets->filter(fn ($s) => $s->completed && $s->weight > 0 && $s->reps > 0);
                if ($weightSets->isEmpty()) continue;

                $bestW = $weightSets->max('weight');
                $bestE = $weightSets->map(fn ($s) => self::epley((float)$s->weight, (int)$s->reps))->max();
                $vol   = $weightSets->sum(fn ($s) => $s->weight * $s->reps);

                if (empty($prs[$exId]['weight']) || $bestW > $prs[$exId]['weight']['value']) {
                    $prs[$exId]['weight'] = ['value' => $bestW, 'date' => $date, 'workoutId' => $wid];
                }
                if (empty($prs[$exId]['e1rm']) || $bestE > $prs[$exId]['e1rm']['value']) {
                    $prs[$exId]['e1rm'] = ['value' => round($bestE, 1), 'date' => $date, 'workoutId' => $wid];
                }
                if (empty($prs[$exId]['volume']) || $vol > $prs[$exId]['volume']['value']) {
                    $prs[$exId]['volume'] = ['value' => $vol, 'date' => $date, 'workoutId' => $wid];
                }
            }
        }

        return response()->json($prs);
    }
}
