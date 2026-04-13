<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ExerciseController;
use App\Http\Controllers\FriendController;
use App\Http\Controllers\PrController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\TemplateController;
use App\Http\Controllers\WorkoutController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| GymLog API Routes
|--------------------------------------------------------------------------
*/

// Public auth routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    // Exercises
    Route::get   ('/exercises',      [ExerciseController::class, 'index']);
    Route::post  ('/exercises',      [ExerciseController::class, 'store']);
    Route::put   ('/exercises/{id}', [ExerciseController::class, 'update']);
    Route::delete('/exercises/{id}', [ExerciseController::class, 'destroy']);

    // Workouts
    Route::get   ('/workouts',      [WorkoutController::class, 'index']);
    Route::get   ('/workouts/{id}', [WorkoutController::class, 'show']);
    Route::post  ('/workouts',      [WorkoutController::class, 'store']);
    Route::delete('/workouts/{id}', [WorkoutController::class, 'destroy']);

    // Templates
    Route::get   ('/templates',      [TemplateController::class, 'index']);
    Route::post  ('/templates',      [TemplateController::class, 'store']);
    Route::put   ('/templates/{id}', [TemplateController::class, 'update']);
    Route::delete('/templates/{id}', [TemplateController::class, 'destroy']);

    // PRs (computed)
    Route::get('/prs', [PrController::class, 'index']);

    // Settings
    Route::get('/settings', [SettingsController::class, 'show']);
    Route::put('/settings', [SettingsController::class, 'update']);

    // Friends
    Route::get   ('/friends',      [FriendController::class, 'index']);
    Route::post  ('/friends',      [FriendController::class, 'store']);
    Route::delete('/friends/{id}', [FriendController::class, 'destroy']);
});
