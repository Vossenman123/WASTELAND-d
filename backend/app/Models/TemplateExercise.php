<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TemplateExercise extends Model
{
    protected $fillable = ['template_id', 'exercise_slug', 'sort_order', 'default_rest'];

    public function template(): BelongsTo
    {
        return $this->belongsTo(Template::class);
    }
}
