<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * ユーザー情報の API レスポンス変換
 *
 * スネークケースのカラム名をキャメルケースに変換して返す。
 */
class UserResource extends JsonResource
{
    /**
     * リソースを配列に変換する
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'name'            => $this->name,
            'email'           => $this->email,
            'emailVerifiedAt' => $this->email_verified_at,
            'createdAt'       => $this->created_at,
            'updatedAt'       => $this->updated_at,
        ];
    }
}
