<?php

namespace App\Http\Controllers\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\MemoRequest;
use App\Http\Resources\MemoResource;
use App\Models\Memo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * メモ CRUD API コントローラー
 *
 * ログインユーザー自身のメモに対する CRUD 操作を提供する。
 * 認可は MemoPolicy で行う。
 */
class MemoController extends Controller
{
    /**
     * メモ一覧を取得する (新しい順)
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $memos = $request->user()->memos()->latest()->get();

        return MemoResource::collection($memos);
    }

    /**
     * メモを新規作成する
     */
    public function store(MemoRequest $request): JsonResponse
    {
        $memo = $request->user()->memos()->create($request->validated());

        return (new MemoResource($memo))->response()->setStatusCode(201);
    }

    /**
     * メモの詳細を取得する
     *
     * @param Memo $memo ルートモデルバインディングで自動取得
     */
    public function show(Request $request, Memo $memo): MemoResource
    {
        $this->authorize('view', $memo);

        return new MemoResource($memo);
    }

    /**
     * メモを更新する
     *
     * @param Memo $memo ルートモデルバインディングで自動取得
     */
    public function update(MemoRequest $request, Memo $memo): MemoResource
    {
        $this->authorize('update', $memo);

        $memo->update($request->validated());

        return new MemoResource($memo);
    }

    /**
     * メモを削除する
     *
     * @param Memo $memo ルートモデルバインディングで自動取得
     */
    public function destroy(Request $request, Memo $memo): JsonResponse
    {
        $this->authorize('delete', $memo);

        $memo->delete();

        return response()->json(null, 204);
    }
}
