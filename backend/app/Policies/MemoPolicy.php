<?php

namespace App\Policies;

use App\Models\Memo;
use App\Models\User;

/**
 * メモの認可ポリシー
 *
 * メモの所有者のみが閲覧・更新・削除できることを保証する。
 */
class MemoPolicy
{
    /**
     * メモの詳細を閲覧できるか判定する
     */
    public function view(User $user, Memo $memo): bool
    {
        return $user->id === $memo->user_id;
    }

    /**
     * メモを更新できるか判定する
     */
    public function update(User $user, Memo $memo): bool
    {
        return $user->id === $memo->user_id;
    }

    /**
     * メモを削除できるか判定する
     */
    public function delete(User $user, Memo $memo): bool
    {
        return $user->id === $memo->user_id;
    }
}
