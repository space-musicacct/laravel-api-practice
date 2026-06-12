import { type ReactElement, type SubmitEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { isApiError, getCsrfCookie } from '../lib/axios';
import type { User, ValidationErrors, ResourceResponse } from '../types';
import { useAuth } from './App';

/**
 * ユーザー登録フォームコンポーネント
 *
 * CSRF Cookie 取得 → 登録 API 呼び出し → 自動ログイン → メモ一覧へ遷移する。
 */
export default function Register(): ReactElement {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [passwordConfirmation, setPasswordConfirmation] = useState<string>('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

  /** 登録フォーム送信処理 */
  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      await getCsrfCookie();
      const res = await api.post<ResourceResponse<User>>('/register', {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setUser(res.data.data);
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

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">新規登録</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name[0]}</p>}
        </div>

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">パスワード (確認)</label>
          <input
            type="password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? '登録中...' : '登録'}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600 text-center">
        既にアカウントをお持ちの方は{' '}
        <Link to="/login" className="text-blue-600 hover:underline">ログイン</Link>
      </p>
    </div>
  );
}
