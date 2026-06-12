<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * memos テーブルに論理削除カラムを追加するマイグレーション
 */
return new class extends Migration
{
    /**
     * deleted_at カラムを追加する
     */
    public function up(): void
    {
        Schema::table('memos', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    /**
     * deleted_at カラムを削除する
     */
    public function down(): void
    {
        Schema::table('memos', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
