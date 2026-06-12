# API 設計書

## 共通仕様

- ベースURL: `http://localhost:40081/api/v1`
- 認証方式: Sanctum SPA 認証 (Cookie/Session ベース)
- レスポンス形式: JsonResource による `{ "data": { ... } }` ラッパー形式 (キャメルケース)
- リクエストヘッダー:
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `X-Requested-With: XMLHttpRequest`
  - `X-XSRF-TOKEN: <cookie から取得>` (POST/PUT/DELETE 時、axios が自動付与)
- 共通エラーレスポンス:
  - `401 Unauthorized` — 未認証
  - `403 Forbidden` — 権限なし
  - `422 Unprocessable Entity` — バリデーションエラー (日本語メッセージ)
  - `500 Internal Server Error` — サーバーエラー

---

## 認証 API

### POST /api/v1/register

ユーザー登録 (登録後に自動ログイン)

**認証:** 不要

**リクエスト:**

| パラメータ | 型 | 必須 | 制約 |
|---|---|---|---|
| name | string | Yes | max:255 |
| email | string | Yes | email, max:255, unique:users |
| password | string | Yes | max:255, min:8 (Password::defaults) |
| password_confirmation | string | Yes | password と一致 |

**レスポンス:**

- `201 Created`
```json
{
  "data": {
    "id": 1,
    "name": "テストユーザー",
    "email": "test@example.com",
    "emailVerifiedAt": null,
    "createdAt": "2026-06-12T00:00:00.000000Z",
    "updatedAt": "2026-06-12T00:00:00.000000Z",
    "deletedAt": null
  }
}
```

- `422 Unprocessable Entity`
```json
{
  "message": "このメールアドレスは既に登録されています。",
  "errors": {
    "email": ["このメールアドレスは既に登録されています。"]
  }
}
```

---

### POST /api/v1/login

ログイン

**認証:** 不要 (事前に `GET /sanctum/csrf-cookie` で CSRF トークンを取得すること)

**ロックアウト制御:** IP 単位で 5 回失敗すると 1 時間ロック。残り時間はレスポンスメッセージに表示される。
ロックアウトのタイマーは初回失敗時に開始し、試行ごとには延長されない。

**リクエスト:**

| パラメータ | 型 | 必須 | 制約 |
|---|---|---|---|
| email | string | Yes | email, max:255 |
| password | string | Yes | max:255 |

**レスポンス:**

- `200 OK`
```json
{
  "data": {
    "id": 1,
    "name": "テストユーザー",
    "email": "test@example.com",
    "emailVerifiedAt": null,
    "createdAt": "2026-06-12T00:00:00.000000Z",
    "updatedAt": "2026-06-12T00:00:00.000000Z",
    "deletedAt": null
  }
}
```

- `401 Unauthorized`
```json
{
  "message": "メールアドレスまたはパスワードが正しくありません。"
}
```

- `429 Too Many Requests` (ロックアウト中)
```json
{
  "message": "ログイン試行回数が上限に達しました。42分後に再試行してください。",
  "errors": {
    "email": ["ログイン試行回数が上限に達しました。42分後に再試行してください。"]
  }
}
```

---

### POST /api/v1/logout

ログアウト

**認証:** 必要

**リクエスト:** なし

**レスポンス:**

- `200 OK`
```json
{
  "message": "ログアウトしました。"
}
```

---

### GET /api/v1/user

ログイン中のユーザー情報を取得

**認証:** 必要

**レスポンス:**

- `200 OK`
```json
{
  "data": {
    "id": 1,
    "name": "テストユーザー",
    "email": "test@example.com",
    "emailVerifiedAt": null,
    "createdAt": "2026-06-12T00:00:00.000000Z",
    "updatedAt": "2026-06-12T00:00:00.000000Z",
    "deletedAt": null
  }
}
```

---

## メモ API

### GET /api/v1/memos

ログインユーザーのメモ一覧を取得 (新しい順)

**認証:** 必要

**レスポンス:**

- `200 OK`
```json
{
  "data": [
    {
      "id": 2,
      "userId": 1,
      "title": "買い物リスト",
      "body": "牛乳、卵、パン",
      "createdAt": "2026-06-12T01:00:00.000000Z",
      "updatedAt": "2026-06-12T01:00:00.000000Z",
      "deletedAt": null
    },
    {
      "id": 1,
      "userId": 1,
      "title": "ToDo",
      "body": "Laravel APIの勉強",
      "createdAt": "2026-06-12T00:00:00.000000Z",
      "updatedAt": "2026-06-12T00:00:00.000000Z",
      "deletedAt": null
    }
  ]
}
```

---

### POST /api/v1/memos

メモを新規作成

**認証:** 必要

**リクエスト:**

| パラメータ | 型 | 必須 | 制約 |
|---|---|---|---|
| title | string | Yes | max:255 |
| body | string | Yes | max:10000 |

**レスポンス:**

- `201 Created`
```json
{
  "data": {
    "id": 3,
    "userId": 1,
    "title": "新しいメモ",
    "body": "メモの内容",
    "createdAt": "2026-06-12T02:00:00.000000Z",
    "updatedAt": "2026-06-12T02:00:00.000000Z",
    "deletedAt": null
  }
}
```

- `422 Unprocessable Entity`
```json
{
  "message": "タイトルは必須です。",
  "errors": {
    "title": ["タイトルは必須です。"]
  }
}
```

---

### GET /api/v1/memos/{id}

メモの詳細を取得

**認証:** 必要 (自分のメモのみ)

**レスポンス:**

- `200 OK`
```json
{
  "data": {
    "id": 1,
    "userId": 1,
    "title": "ToDo",
    "body": "Laravel APIの勉強",
    "createdAt": "2026-06-12T00:00:00.000000Z",
    "updatedAt": "2026-06-12T00:00:00.000000Z",
    "deletedAt": null
  }
}
```

- `403 Forbidden` — 他ユーザーのメモにアクセスした場合

---

### PUT /api/v1/memos/{id}

メモを更新

**認証:** 必要 (自分のメモのみ)

**リクエスト:**

| パラメータ | 型 | 必須 | 制約 |
|---|---|---|---|
| title | string | Yes | max:255 |
| body | string | Yes | max:10000 |

**レスポンス:**

- `200 OK`
```json
{
  "data": {
    "id": 1,
    "userId": 1,
    "title": "更新後のタイトル",
    "body": "更新後の本文",
    "createdAt": "2026-06-12T00:00:00.000000Z",
    "updatedAt": "2026-06-12T03:00:00.000000Z",
    "deletedAt": null
  }
}
```

- `403 Forbidden` — 他ユーザーのメモを更新しようとした場合
- `422 Unprocessable Entity` — バリデーションエラー

---

### DELETE /api/v1/memos/{id}

メモを削除 (論理削除: `deleted_at` に日時が記録され、一覧・詳細からは非表示になる)

**認証:** 必要 (自分のメモのみ)

**レスポンス:**

- `204 No Content` — 成功 (レスポンスボディなし)
- `403 Forbidden` — 他ユーザーのメモを削除しようとした場合
