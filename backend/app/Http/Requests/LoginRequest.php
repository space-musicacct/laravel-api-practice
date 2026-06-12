<?php

namespace App\Http\Requests;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * ログインリクエストのバリデーション
 *
 * IP 単位のログイン試行ロックアウト制御を含む。
 * 5 回失敗で 1 時間ロック。
 */
class LoginRequest extends FormRequest
{
    /** ロックアウトまでの最大試行回数 */
    private const MAX_ATTEMPTS = 5;

    /** ロックアウト時間 (秒) */
    private const LOCKOUT_SECONDS = 3600;

    /**
     * リクエストの認可 (ログインは誰でも可能)
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * バリデーションルール
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'email'    => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ];
    }

    /**
     * バリデーションエラーメッセージ
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required'    => 'メールアドレスは必須です。',
            'email.string'      => 'メールアドレスは文字列で入力してください。',
            'email.email'       => '有効なメールアドレスを入力してください。',
            'email.max'         => 'メールアドレスは255文字以内で入力してください。',
            'password.required' => 'パスワードは必須です。',
            'password.string'   => 'パスワードは文字列で入力してください。',
            'password.max'      => 'パスワードは255文字以内で入力してください。',
        ];
    }

    /**
     * ログイン試行回数がロックアウト上限に達していないか確認する
     *
     * @throws ValidationException ロックアウト中の場合
     */
    public function ensureIsNotRateLimited(): void
    {
        if (!RateLimiter::tooManyAttempts($this->throttleKey(), self::MAX_ATTEMPTS)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());
        $minutes = (int) ceil($seconds / 60);

        throw ValidationException::withMessages([
            'email' => ["ログイン試行回数が上限に達しました。{$minutes}分後に再試行してください。"],
        ])->status(429);
    }

    /**
     * ログイン失敗時に試行回数を加算する
     */
    public function hitRateLimit(): void
    {
        RateLimiter::hit($this->throttleKey(), self::LOCKOUT_SECONDS);
    }

    /**
     * ログイン成功時に試行回数をリセットする
     */
    public function clearRateLimit(): void
    {
        RateLimiter::clear($this->throttleKey());
    }

    /**
     * レートリミッターのキーを生成する (IP 単位)
     */
    private function throttleKey(): string
    {
        return 'login|' . $this->ip();
    }
}
