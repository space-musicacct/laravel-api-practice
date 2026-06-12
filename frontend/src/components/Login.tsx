import { type ReactElement, type SubmitEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { isApiError, getCsrfCookie } from '../lib/axios';
import type { User, ValidationErrors, ResourceResponse } from '../types';
import { useAuth } from './App';

/**
 * ログインフォームコンポーネント
 *
 * CSRF Cookie 取得 → ログイン API 呼び出し → 認証状態更新の流れを実装する。
 */
export default function Login(): ReactElement {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  /** ログインフォーム送信処理 */
  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');
    setSubmitting(true);

    try {
      await getCsrfCookie();
      const res = await api.post<ResourceResponse<User>>('/login', { email, password });
      setUser(res.data.data);
      navigate('/memos');
    } catch (err) {
      if (isApiError(err)) {
        const { status, data } = err.response;
        if (status === 422 && data.errors) {
          setErrors(data.errors);
        } else {
          setGeneralError(data.message ?? 'ログインに失敗しました。');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">ログイン</h2>

      {generalError && (
        <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{generalError}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email[0]}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password[0]}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600 text-center">
        アカウントをお持ちでない方は{' '}
        <Link to="/register" className="text-blue-600 hover:underline">新規登録</Link>
      </p>
    </div>
  );
}
