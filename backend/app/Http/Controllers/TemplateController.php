<?php

namespace App\Http\Controllers;

use App\Models\Template;
use App\Models\TemplateExercise;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TemplateController extends Controller
{
    /** GET /api/templates */
    public function index(Request $request): JsonResponse
    {
        $templates = Template::where('user_id', $request->user()->id)
            ->with('exercises')
            ->get();

        return response()->json($templates->map(fn ($t) => $this->format($t)));
    }

    /** POST /api/templates */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id'                         => 'required|string|max:64',
            'name'                       => 'required|string|max:128',
            'exercises'                  => 'nullable|array',
            'exercises.*.exerciseId'     => 'required|string',
            'exercises.*.rest'           => 'nullable|integer',
        ]);

        $template = Template::create([
            'user_id' => $request->user()->id,
            'slug'    => $data['id'],
            'name'    => $data['name'],
        ]);

        foreach ($data['exercises'] ?? [] as $i => $ex) {
            TemplateExercise::create([
                'template_id'   => $template->id,
                'exercise_slug' => $ex['exerciseId'],
                'sort_order'    => $i,
                'default_rest'  => $ex['rest'] ?? 90,
            ]);
        }

        return response()->json($this->format($template->load('exercises')), 201);
    }

    /** PUT /api/templates/{slug} */
    public function update(Request $request, string $slug): JsonResponse
    {
        $template = Template::where('user_id', $request->user()->id)
            ->where('slug', $slug)
            ->firstOrFail();

        $data = $request->validate([
            'name'                       => 'sometimes|string|max:128',
            'exercises'                  => 'nullable|array',
            'exercises.*.exerciseId'     => 'required|string',
            'exercises.*.rest'           => 'nullable|integer',
        ]);

        if (isset($data['name'])) $template->update(['name' => $data['name']]);

        if (array_key_exists('exercises', $data)) {
            $template->exercises()->delete();
            foreach ($data['exercises'] ?? [] as $i => $ex) {
                TemplateExercise::create([
                    'template_id'   => $template->id,
                    'exercise_slug' => $ex['exerciseId'],
                    'sort_order'    => $i,
                    'default_rest'  => $ex['rest'] ?? 90,
                ]);
            }
        }

        return response()->json($this->format($template->load('exercises')));
    }

    /** DELETE /api/templates/{slug} */
    public function destroy(Request $request, string $slug): JsonResponse
    {
        Template::where('user_id', $request->user()->id)
            ->where('slug', $slug)
            ->firstOrFail()
            ->delete();

        return response()->json(null, 204);
    }

    private function format(Template $t): array
    {
        return [
            'id'        => $t->slug,
            'name'      => $t->name,
            'exercises' => $t->exercises->map(fn ($te) => [
                'exerciseId' => $te->exercise_slug,
                'rest'       => $te->default_rest,
            ])->values(),
        ];
    }
}
