<?php

namespace App\Http\Controllers\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

/**
 * 認証 API コントローラー
 *
 * ユーザー登録・ログイン・ログアウトを処理する。
 * Sanctum の Cookie/Session 認証を使用。
 */
class AuthController extends Controller
{
    /**
     * ユーザー登録
     *
     * 新規ユーザーを作成し、そのままログイン状態にする。
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    /**
     * ログイン
     *
     * メールアドレスとパスワードで認証し、セッションを開始する。
     * IP 単位のロックアウト制御 (5回失敗で1時間ロック) を含む。
     */
    public function login(LoginRequest $request): UserResource | JsonResponse
    {
        $request->ensureIsNotRateLimited();

        if (!Auth::attempt($request->validated())) {
            $request->hitRateLimit();

            return response()->json(['message' => 'メールアドレスまたはパスワードが正しくありません。'], 401);
        }

        $request->clearRateLimit();
        $request->session()->regenerate();

        return new UserResource(Auth::user());
    }

    /**
     * ログアウト
     *
     * セッションを破棄し、CSRF トークンを再生成する。
     * auth:sanctum ミドルウェア下では web ガードを明示的に指定する必要がある。
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'ログアウトしました。']);
    }
}
