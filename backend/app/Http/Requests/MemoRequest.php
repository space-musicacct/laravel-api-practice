<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * メモの作成・更新リクエストのバリデーション
 */
class MemoRequest extends FormRequest
{
    /**
     * リクエストの認可 (認可はルートミドルウェアで行うため常に true)
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
            'title' => ['required', 'string', 'max:255'],
            'body'  => ['required', 'string', 'max:10000'],
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
            'title.required' => 'タイトルは必須です。',
            'title.string'   => 'タイトルは文字列で入力してください。',
            'title.max'      => 'タイトルは255文字以内で入力してください。',
            'body.required'  => '本文は必須です。',
            'body.string'    => '本文は文字列で入力してください。',
            'body.max'       => '本文は10000文字以内で入力してください。',
        ];
    }
}
