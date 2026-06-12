import { type ReactElement, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/axios';
import type { Memo, ResourceResponse } from '../types';

/**
 * メモ一覧コンポーネント
 *
 * ログインユーザーのメモ一覧を表示し、編集・削除操作を提供する。
 */
export default function MemoList(): ReactElement {
  const [memos, setMemos] = useState<Memo[]>([]);

  useEffect(() => {
    api.get<ResourceResponse<Memo[]>>('/memos').then((res) => setMemos(res.data.data));
  }, []);

  /** メモを削除する (確認ダイアログ付き) */
  const handleDelete = async (id: number): Promise<void> => {
    if (!confirm('このメモを削除しますか？')) return;
    await api.delete<void>(`/memos/${id}`);
    setMemos((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">メモ一覧</h2>
        <Link
          to="/memos/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          新規作成
        </Link>
      </div>

      {memos.length === 0 ? (
        <p className="text-gray-500 text-center py-8">メモがありません。新しいメモを作成しましょう！</p>
      ) : (
        <div className="space-y-4">
          {memos.map((memo) => (
            <div key={memo.id} className="bg-white rounded shadow p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{memo.title}</h3>
                  <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap">{memo.body}</p>
                  <p className="text-gray-400 text-xs mt-2">
                    {new Date(memo.updatedAt).toLocaleString('ja-JP')}
                  </p>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <Link
                    to={`/memos/${memo.id}/edit`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    編集
                  </Link>
                  <button
                    onClick={() => handleDelete(memo.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
