<?php

use App\Http\Controllers\V1\AuthController;
use App\Http\Controllers\V1\MemoController;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/user', function (Request $request) {
        return new UserResource($request->user());
    });

    Route::apiResource('memos', MemoController::class);
});
