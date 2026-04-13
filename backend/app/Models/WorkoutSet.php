<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkoutSet extends Model
{
    protected $fillable = [
        'workout_exercise_id', 'set_number', 'weight', 'reps', 'duration', 'completed',
    ];

    protected $casts = [
        'completed' => 'boolean',
        'weight'    => 'float',
        'reps'      => 'integer',
        'duration'  => 'integer',
    ];

    public function workoutExercise(): BelongsTo
    {
        return $this->belongsTo(WorkoutExercise::class);
    }
}
