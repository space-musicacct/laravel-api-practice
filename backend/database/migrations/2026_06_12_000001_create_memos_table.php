<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * memos テーブルを作成するマイグレーション
 */
return new class extends Migration
{
    /**
     * テーブルを作成する
     */
    public function up(): void
    {
        Schema::create('memos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title', 255);
            $table->text('body');
            $table->timestamps();
        });
    }

    /**
     * テーブルを削除する
     */
    public function down(): void
    {
        Schema::dropIfExists('memos');
    }
};
