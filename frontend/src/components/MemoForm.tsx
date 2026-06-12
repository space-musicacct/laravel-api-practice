import { type ReactElement, type SubmitEvent, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { isApiError } from '../lib/axios';
import type { Memo, ValidationErrors, ResourceResponse } from '../types';

/**
 * メモ作成・編集フォームコンポーネント
 *
 * URL パラメータの有無で新規作成 (/memos/new) と編集 (/memos/:id/edit) を切り替える。
 * 編集時は既存データを API から取得してフォームに反映する。
 */
export default function MemoForm(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = id !== undefined;

  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(isEditing);

  /** 編集時: 既存メモのデータを取得する */
  useEffect(() => {
    if (isEditing) {
      api.get<ResourceResponse<Memo>>(`/memos/${id}`)
        .then((res) => {
          setTitle(res.data.data.title);
          setBody(res.data.data.body);
        })
        .catch(() => navigate('/memos'))
        .finally(() => setLoading(false));
    }
  }, [id, isEditing, navigate]);

  /** フォーム送信処理 (新規作成 or 更新) */
  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      if (isEditing) {
        await api.put<ResourceResponse<Memo>>(`/memos/${id}`, { title, body });
      } else {
        await api.post<ResourceResponse<Memo>>('/memos', { title, body });
      }
      navigate('/memos');
    } catch (err) {
      if (isApiError(err)) {
        const { status, data } = err.response;
        if (status === 422 && data.errors) {
          setErrors(data.errors);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-gray-500 text-center py-8">読み込み中...</p>;
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {isEditing ? 'メモを編集' : '新しいメモ'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title[0]}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">本文</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {errors.body && <p className="text-red-600 text-sm mt-1">{errors.body[0]}</p>}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? '保存中...' : '保存'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/memos')}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
