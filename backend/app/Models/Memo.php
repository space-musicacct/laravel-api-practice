<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * メモモデル
 *
 * ユーザーが作成するメモを表す。各メモは1人のユーザーに所属する。
 */
class Memo extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['title', 'body'];

    /**
     * このメモを所有するユーザーを取得する
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
