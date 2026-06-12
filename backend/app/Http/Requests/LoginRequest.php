<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * ログインリクエストのバリデーション
 */
class LoginRequest extends FormRequest
{
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
}
