/** ユーザー情報 (API レスポンス) */
export interface User {
  id: number;
  name: string;
  email: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** メモ情報 (API レスポンス) */
export interface Memo {
  id: number;
  userId: number;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** バリデーションエラーのフィールド別メッセージ */
export interface ValidationErrors {
  [field: string]: string[];
}

/** API エラーレスポンスの共通形式 (Laravel が返す JSON) */
export interface ApiErrorResponse {
  message: string;
  errors?: ValidationErrors;
}

/** メッセージのみのレスポンス (ログアウト等) */
export interface MessageResponse {
  message: string;
}

/** JsonResource のラッパー形式 ({ data: T }) */
export interface ResourceResponse<T> {
  data: T;
}
