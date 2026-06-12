<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * メモ情報の API レスポンス変換
 *
 * スネークケースのカラム名をキャメルケースに変換して返す。
 */
class MemoResource extends JsonResource
{
    /**
     * リソースを配列に変換する
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'        => $this->id,
            'userId'    => $this->user_id,
            'title'     => $this->title,
            'body'      => $this->body,
            'createdAt' => $this->created_at,
            'updatedAt' => $this->updated_at,
            'deletedAt' => $this->deleted_at,
        ];
    }
}
