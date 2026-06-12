<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

/**
 * ユーザー登録リクエストのバリデーション
 */
class RegisterRequest extends FormRequest
{
    /**
     * リクエストの認可 (登録は誰でも可能)
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * バリデーションルール
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'max:255', 'confirmed', Password::defaults()],
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
            'name.required'      => '名前は必須です。',
            'name.string'        => '名前は文字列で入力してください。',
            'name.max'           => '名前は255文字以内で入力してください。',
            'email.required'     => 'メールアドレスは必須です。',
            'email.string'       => 'メールアドレスは文字列で入力してください。',
            'email.email'        => '有効なメールアドレスを入力してください。',
            'email.max'          => 'メールアドレスは255文字以内で入力してください。',
            'email.unique'       => 'このメールアドレスは既に登録されています。',
            'password.required'  => 'パスワードは必須です。',
            'password.string'    => 'パスワードは文字列で入力してください。',
            'password.max'       => 'パスワードは255文字以内で入力してください。',
            'password.confirmed' => 'パスワードが確認用と一致しません。',
        ];
    }
}
