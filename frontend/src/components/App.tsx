import { type ReactElement, type ReactNode, useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import type { User, MessageResponse, ResourceResponse } from '../types';
import Login from './Login';
import Register from './Register';
import MemoList from './MemoList';
import MemoForm from './MemoForm';

/** 認証コンテキストの型 */
interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, setUser: () => {} });

/** 認証コンテキストを取得するカスタムフック */
export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}

/** 認証済みユーザーのみアクセス可能なルートガード */
function RequireAuth({ children }: { children: ReactNode }): ReactElement {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** 未認証ユーザーのみアクセス可能なルートガード */
function GuestOnly({ children }: { children: ReactNode }): ReactElement {
  const { user } = useAuth();
  if (user) return <Navigate to="/memos" replace />;
  return <>{children}</>;
}

/**
 * ルートコンポーネント
 *
 * 認証状態の管理、ルーティング定義、ヘッダー表示を担当する。
 * AuthContext で子コンポーネントにユーザー情報を提供する。
 */
export default function App(): ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<ResourceResponse<User>>('/user')
      .then((res) => setUser(res.data.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  /** ログアウト処理 */
  const handleLogout = async (): Promise<void> => {
    await api.post<MessageResponse>('/logout');
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <AuthContext value={{ user, setUser }}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/memos" className="text-xl font-bold text-gray-800 hover:text-gray-600">
              メモ帳
            </Link>
            {user && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">{user.name}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  ログアウト
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
            <Route path="/memos" element={<RequireAuth><MemoList /></RequireAuth>} />
            <Route path="/memos/new" element={<RequireAuth><MemoForm /></RequireAuth>} />
            <Route path="/memos/:id/edit" element={<RequireAuth><MemoForm /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/memos" replace />} />
          </Routes>
        </main>
      </div>
    </AuthContext>
  );
}
