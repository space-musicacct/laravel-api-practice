# Laravel API 開発ガイド — Blade CRUD から API + SPA へ

## 1. はじめに

このドキュメントは **PHP の基礎と Laravel の Blade CRUD を理解している人** が、次のステップとして
「Laravel で API を作り、フロントエンド (React) から呼び出す」開発スタイルを学ぶためのガイドです。

### Laravel バージョンについて

このリポジトリは、2026年8月上旬までは **Laravel 10** 前提の教材として公開しています。

**理由:**
- space のとあるチーム開発における学習時の互換性を優先するため
- Blade CRUD 既習者が API + SPA に進むための教材として、Laravel 10 構成を維持するため

**注意:**
Laravel 10 は公式サポート終了済みのため、新規の本番開発では **Laravel 12 / 13 以降**の利用を推奨します。

2026年8月上旬以降、Laravel 13 へのアップグレード版を作成予定です。

### 作るもの

- **ログイン機能付きの簡易メモ帳 API**
- Sanctum の Cookie/Session 認証でログイン・ログアウト・ユーザー登録
- メモの CRUD (一覧・作成・詳細・更新・削除)
- React (TypeScript + Tailwind CSS) のフロントエンドから API を呼び出して動作確認

### 初回セットアップ

クローン直後は `.gitignore` により以下のファイル/ディレクトリが存在しません。
Docker コンテナの起動時に自動でセットアップされます。

| 対象 | .gitignore | セットアップ方法 |
|------|-----------|-----------------|
| `backend/vendor/` | ✅ 除外 | コンテナ起動時に `entrypoint.sh` が `composer install` を自動実行 |
| `backend/.env` | ✅ 除外 | コンテナ起動時に `entrypoint.sh` が `.env.example` からコピー + `key:generate` を自動実行 |
| `frontend/node_modules/` | ✅ 除外 | frontend コンテナ起動時に `npm install` を自動実行 |

```bash
# 1. コンテナ起動 (初回はビルド + 依存インストールで数分かかる)
docker compose up -d --build

# 2. DB 初期化 (テーブル作成 + テストユーザー作成)
docker compose exec backend php artisan migrate:fresh --seed

# 3. ブラウザでアクセス
# http://localhost:40081
```

テストユーザー: `test@example.com` / パスワード: `password`

### 権限エラーが出た場合

Docker コンテナ内のプロセス (PHP-FPM = `www-data` ユーザー) とホスト側のユーザーで
ファイル所有者が異なり、以下のようなエラーが出ることがあります。

```
The stream or file "storage/logs/laravel.log" could not be opened in append mode:
Failed to open stream: Permission denied
```

**対処法:**

```bash
# storage/ と bootstrap/cache/ の権限をコンテナ内で修正
docker compose exec backend chown -R www-data:www-data storage bootstrap/cache
docker compose exec backend chmod -R 775 storage bootstrap/cache
```

`entrypoint.sh` がコンテナ起動時に `chown` を実行しますが、ホスト側でファイルを作成・編集した場合に
所有者がずれることがあります。権限エラーが出たら上記コマンドで復旧してください。

また、`php artisan make:*` 系のコマンドで生成したファイルがコンテナ内の root 所有になることがあります。
ホスト側で編集できない場合は以下で所有者を変更してください:

```bash
# 特定ファイルの所有者をホストユーザーに変更 (UID 1000 = 一般的な Linux ユーザー)
docker compose exec backend chown 1000:1000 app/Http/Controllers/V1/SomeController.php

# 権限不足で chown できない場合は -u root で実行
docker compose exec -u root backend chown -R www-data:www-data storage bootstrap/cache
```

※ UID 1000 は一般的な Linux / WSL ユーザーの場合です。環境によって異なる場合は
`id -u` コマンドで自分の UID を確認してください。

---

## 2. Blade 方式 vs API 方式 — 全体像の比較

Blade CRUD と API + SPA の違いを一覧で見てみましょう。

| 観点 | Blade 方式 | API 方式 |
|------|-----------|----------|
| レスポンス | HTML (`return view(...)`) | JSON (API Resource 経由、キャメルケース) |
| ルーティング | `Route::resource(...)` (7ルート) | `Route::apiResource(...)` (5ルート) |
| フォーム | `<form>` + `@csrf` | JavaScript の `axios.post(...)` |
| CSRF 対策 | `@csrf` Blade ディレクティブ | `XSRF-TOKEN` Cookie → axios が自動送信 |
| バリデーションエラー | `$errors` 変数 + `@error` ディレクティブ | JSON `422 { errors: { title: [...] } }` |
| 認証 | セッション + ログインページへリダイレクト | セッション + JSON `401` レスポンス |
| 状態管理 | サーバー側 (セッション flash, old input) | クライアント側 (React の state) |
| 画面遷移 | サーバーがHTMLを返すたびにページ全体が更新 | JavaScript が部分的に DOM を書き換え |

### リクエストフローの違い

**Blade 方式:**

```
ブラウザ → Laravel (Controller) → Blade テンプレート → HTML レスポンス → ブラウザが全体を描画
```

**API 方式:**

```
ブラウザ → React → axios → Laravel API (Controller) → JSON レスポンス → React が DOM を部分更新
```

API 方式では Laravel は **データ (JSON) を返すだけ** で、画面の描画はフロントエンド (React) が担当します。
これにより、バックエンド (データ処理) とフロントエンド (UI) の責務が明確に分かれます。

---

## 3. プロジェクト構成

```
laravel-api-practice/
├── backend/                  ← Laravel (API サーバー)
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Controller.php        ← 基底コントローラー
│   │   │   │   └── V1/                   ← v1 API コントローラー
│   │   │   │       ├── AuthController.php
│   │   │   │       └── MemoController.php
│   │   │   ├── Middleware/
│   │   │   ├── Requests/                 ← FormRequest (バージョン共通)
│   │   │   │   ├── LoginRequest.php
│   │   │   │   ├── RegisterRequest.php
│   │   │   │   └── MemoRequest.php
│   │   │   └── Resources/               ← API Resource (バージョン共通)
│   │   │       ├── UserResource.php
│   │   │       └── MemoResource.php
│   │   ├── Models/
│   │   │   ├── User.php
│   │   │   └── Memo.php
│   │   ├── Policies/
│   │   │   └── MemoPolicy.php            ← 認可ポリシー
│   │   └── Providers/
│   │       └── RouteServiceProvider.php  ← バージョン別ルート読み込み
│   ├── config/
│   │   ├── cors.php                      ← CORS 設定
│   │   └── sanctum.php                   ← Sanctum 設定
│   ├── database/migrations/
│   ├── routes/
│   │   └── api_v1.php                    ← v1 API ルート定義
│   └── ...
│
├── frontend/                 ← React SPA (TypeScript + Tailwind CSS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── App.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── MemoList.tsx
│   │   │   └── MemoForm.tsx
│   │   ├── lib/
│   │   │   └── axios.ts                  ← axios 設定
│   │   └── types.ts                      ← 型定義
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── docker/
│   └── nginx/
│       └── default.dev.conf              ← nginx ルーティング
├── compose.yml
└── docs/                     ← ドキュメント
```

**ポイント:** `backend/` と `frontend/` が完全に分離されています。
Laravel は API (JSON) を返すだけ、React は API を呼んで画面を作るだけ。
この分離により、将来フロントエンドだけ別の技術 (Vue, Next.js 等) に差し替えることもできます。

nginx がリクエストを振り分けます:

- `/api/*` (= `/api/v1/*`), `/sanctum/*` → backend (Laravel)
- それ以外 → frontend (Vite/React)

### API バージョニング

API の URL には **バージョンプレフィックス** (`/api/v1/`) を付けています。

```
/api/v1/memos      ← 現在のバージョン
/api/v2/memos      ← 将来の破壊的変更時に追加
```

**なぜバージョニングが必要か:**
API は一度公開するとクライアント (フロントエンドやモバイルアプリ) が依存します。
レスポンス形式やパラメータに破壊的変更を加えると、既存クライアントが壊れます。
バージョンプレフィックスがあれば、新バージョンを `/api/v2/` として追加しつつ、
旧クライアントは `/api/v1/` を使い続けられます。

**このプロジェクトの構成:**

```
routes/
  api_v1.php           ← v1 のルート定義
  api_v2.php           ← 将来追加 (変更のあるエンドポイントのみ)

app/Http/Controllers/
  V1/
    AuthController.php ← v1 のコントローラー
    MemoController.php
  V2/
    MemoController.php ← 将来追加 (v2 で変更するものだけ)
```

`RouteServiceProvider` でバージョンごとにルートファイルを読み込みます:

```php
Route::middleware('api')->prefix('api/v1')
    ->group(base_path('routes/api_v1.php'));

// 将来:
// Route::middleware('api')->prefix('api/v2')
//     ->group(base_path('routes/api_v2.php'));
```

ルートファイルとコントローラーがバージョン単位で独立しているため、
v2 で memos だけ破壊的変更がある場合、auth は v1 のコントローラーを流用しつつ
memos だけ `V2\MemoController` に差し替えることができます。

---

## 4. 認証の仕組み

### 4.1 Sanctum SPA 認証とは

Laravel Sanctum は、**同一オリジン (Same-Origin) の SPA** 向けに
Cookie/Session ベースの認証を提供するパッケージです。

「同一オリジン」とは、ブラウザから見て **API もフロントエンドも同じドメイン・ポートでアクセスできる** 状態のこと。
このプロジェクトでは nginx が `localhost:40081` で全リクエストを受け取り、
バックエンドとフロントエンドに振り分けるので、ブラウザから見るとすべて `localhost:40081` です。

**なぜ API トークン (Bearer token) を使わないのか？**

Sanctum には API トークン方式もありますが、同一オリジンの場合は Cookie/Session 方式の方が:
- トークンの保存場所を気にしなくてよい (Cookie は自動で送られる)
- CSRF 対策が Sanctum に組み込まれている
- セッションの失効管理が Laravel 側で完結する

つまり **Blade アプリと同じセッション認証の仕組みをそのまま使える** のが最大のメリットです。

### 4.2 設定ファイルの確認

認証が動くために必要な設定は複数のファイルにまたがっています。
それぞれの役割を確認しましょう。

#### `config/sanctum.php` — Sanctum の設定

```php
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
    '%s%s',
    'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1',
    Sanctum::currentApplicationUrlWithPort()
))),

'guard' => ['web'],
```

- **`stateful`**: ここに列挙されたドメインからのリクエストは「ステートフル」として扱われ、
  Cookie/Session 認証が使われます。`.env` に `SANCTUM_STATEFUL_DOMAINS=localhost:40081` を追加しています。
- **`guard`**: `web` ガード = セッション認証を使うという意味です。

#### `app/Http/Kernel.php` — ミドルウェア

```php
'api' => [
    \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
    \Illuminate\Routing\Middleware\ThrottleRequests::class.':api',
    \Illuminate\Routing\Middleware\SubstituteBindings::class,
],
```

**`EnsureFrontendRequestsAreStateful`** がポイントです。
このミドルウェアは、`SANCTUM_STATEFUL_DOMAINS` に一致するフロントエンドからのリクエストに対して、
Cookie / Session ベースの認証が使えるようにするミドルウェアです。
これにより API ルートでも Laravel のセッション認証を使って `Auth::user()` を取得できます。

これがないと、API ルートはステートレス (トークン認証のみ) になり、
Cookie/Session ベースの認証は機能しません。

#### `config/cors.php` — CORS 設定

```php
'supports_credentials' => true,
```

`true` にすることで、ブラウザが Cookie を API リクエストに含めることを許可します。

#### `.env` — 環境変数

```
SANCTUM_STATEFUL_DOMAINS=localhost:40081
```

nginx 経由でアクセスするドメイン・ポートを指定します。

#### `frontend/src/lib/axios.ts` — axios の設定

```typescript
const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});
```

- **`withCredentials: true`**: axios が Cookie をリクエストに含めるようにします。
  これがないとセッション Cookie が送られず、毎回「未認証」になります。
- **`withXSRFToken: true`**: `XSRF-TOKEN` Cookie を自動で `X-XSRF-TOKEN` ヘッダーに付与します (Sanctum 公式推奨)。
- **`Accept: application/json`**: Laravel にJSON レスポンスを要求します。
  これにより、バリデーションエラーや未認証時に HTML ではなく JSON が返されます。
- **`X-Requested-With: XMLHttpRequest`**: Laravel に「通常のページ遷移ではなく JavaScript からのリクエスト」
  であることを伝える補助的なヘッダーです。
  Sanctum のステートフル判定で主に重要なのは `SANCTUM_STATEFUL_DOMAINS` と `Origin` / `Referer` です。

### 4.3 AuthController の実装解説

バリデーションは FormRequest (`RegisterRequest`, `LoginRequest`) に分離しています。
エラーメッセージは `messages()` メソッドで日本語を定義しています。

#### ユーザー登録 (`register`)

```php
public function register(RegisterRequest $request): JsonResponse
{
    $validated = $request->validated();

    $user = User::create([
        'name'     => $validated['name'],
        'email'    => $validated['email'],
        'password' => Hash::make($validated['password']),
    ]);

    Auth::login($user);
    $request->session()->regenerate();

    return (new UserResource($user))->response()->setStatusCode(201);
}
```

バリデーション (FormRequest) → ユーザー作成 → ログイン → セッション ID 再生成 → `UserResource` で JSON 返却。
`login()` と同じく `session()->regenerate()` でセッション固定攻撃を防ぎます。
Blade 方式の `return redirect()->route('home')` の代わりに API Resource 経由でレスポンスを返します。

`Hash::make()` は `config/hashing.php` で設定されたアルゴリズムでパスワードをハッシュします。
このプロジェクトでは **Argon2id** (`memory: 65536KB, time: 4, threads: 1`) を採用しています。
bcrypt も現在広く使われる安全な選択肢ですが (Laravel のデフォルトは bcrypt)、
Argon2id はメモリコストを設定できるため、GPU/ASIC による総当たり攻撃への耐性を高めやすいアルゴリズムです。
OWASP (Open Worldwide Application Security Project) のパスワード保存ガイドラインでも
Argon2id が第一推奨として挙げられています。
なお、User モデルの `'password' => 'hashed'` キャストにより、`Hash::make()` を経由せず
代入した場合でも自動でハッシュされる二重安全構造になっています。

`UserResource` はスネークケースのカラム名 (`email_verified_at`) をキャメルケース (`emailVerifiedAt`) に
変換して返します。フロントエンド (JavaScript/TypeScript) の命名規則に合わせるためです。

#### ログイン (`login`)

```php
public function login(LoginRequest $request): UserResource | JsonResponse
{
    $request->ensureIsNotRateLimited();

    if (!Auth::attempt($request->validated())) {
        $request->hitRateLimit();

        return response()->json(['message' => 'メールアドレスまたはパスワードが正しくありません。'], 401);
    }

    $request->clearRateLimit();
    $request->session()->regenerate();

    return new UserResource(Auth::user());
}
```

- **`ensureIsNotRateLimited()`**: ログイン試行回数のロックアウト制御。IP 単位で 5 回失敗すると 1 時間ロック。
  ロックアウト中は `429 Too Many Requests` + 残り時間を含む日本語メッセージを返す。
- **`hitRateLimit()`**: ログイン失敗時に試行回数を加算する。タイマーは初回失敗時に開始し、試行ごとには延長されない。
- **`clearRateLimit()`**: ログイン成功時にカウントをリセットする。
- **`Auth::attempt($credentials)`**: Blade の `LoginController` と全く同じメソッドです。
  セッションにユーザー情報を保存し、認証 Cookie を発行します。
- **`$request->session()->regenerate()`**: セッション固定攻撃を防ぐためにセッション ID を再生成します。
  Blade 方式でも同じことをしていますが、通常は `Auth::routes()` の裏で自動的に行われているので意識しないだけです。
- 失敗時は **`401` ステータスコード** で JSON を返します (Blade なら `redirect()->back()` でフォームに戻す)。
- 成功時は `UserResource` を返します。Laravel が自動で `{ "data": { ... } }` 形式のキャメルケース JSON に変換します。

#### ロックアウトの解除方法

開発中にロックアウトされた場合は、Laravel のキャッシュをクリアすることで解除できます:

```bash
docker compose exec backend php artisan cache:clear
```

※ これは `RateLimiter` がキャッシュドライバ (デフォルト: file) を使っているためです。
本番環境ではキャッシュ全体がクリアされるため、特定 IP のみ解除したい場合は
`RateLimiter::clear('login|{IP}')` を tinker で実行してください:

```bash
docker compose exec backend php artisan tinker
>>> \Illuminate\Support\Facades\RateLimiter::clear('login|172.20.0.1');
```

#### ログアウト (`logout`)

```php
public function logout(Request $request): JsonResponse
{
    Auth::guard('web')->logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();

    return response()->json(['message' => 'ログアウトしました。']);
}
```

セッションの破棄 + CSRF トークンの再生成。Blade の `LogoutController` と同じ処理です。

**注意:** `Auth::logout()` ではなく **`Auth::guard('web')->logout()`** と明示的に `web` ガードを指定しています。
`auth:sanctum` ミドルウェア下ではデフォルトガードが Sanctum の `RequestGuard` になり、
`logout()` メソッドを持たないためエラーになります。`web` ガードを指定することでセッションベースのログアウトが正しく実行されます。

### 4.4 Blade 方式との違い (まとめ)

| 処理 | Blade 方式 | API 方式 |
|------|-----------|----------|
| ログイン成功 | `redirect()->intended('/home')` | `new UserResource(Auth::user())` |
| ログイン失敗 | `redirect()->back()->withErrors(...)` | `response()->json([...], 401)` |
| ログアウト | `redirect('/')` | `response()->json([...])` |
| 認証チェック | `auth` ミドルウェア → ログインページへリダイレクト | `auth:sanctum` → `401` JSON |

**重要な共通点:** 使っている認証の仕組み自体は同じ (`Auth::attempt`, `Auth::login`, セッション) です。
違うのは **レスポンスの形式だけ** (HTML vs JSON)。

---

## 5. メモ CRUD API の実装

### 5.1 Model と Migration

```php
// app/Models/Memo.php
class Memo extends Model
{
    protected $fillable = ['title', 'body'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

```php
// マイグレーション
Schema::create('memos', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('title', 255);
    $table->text('body');
    $table->timestamps();
});
```

**Blade 方式と全く同じです。** Model と Migration は API 方式でも変わりません。
Eloquent のリレーション、`$fillable`、マイグレーションの書き方、すべて同じです。

### 5.2 ルーティング

```php
// routes/api_v1.php (RouteServiceProvider で prefix('api/v1') が付与される)
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('memos', MemoController::class);
});
```

Blade では `Route::resource('memos', MemoController::class)` を使いますが、
API では **`Route::apiResource`** を使います。

**違い:** `apiResource` は `create` と `edit` ルートを **生成しません**。
なぜなら、API には「フォーム表示ページ」が存在しないからです。

| メソッド | パス | アクション | Blade の `resource` | API の `apiResource` |
|---------|------|----------|--------------------|--------------------|
| GET | /api/v1/memos | index | ✅ | ✅ |
| GET | /memos/create | create | ✅ | ❌ |
| POST | /api/v1/memos | store | ✅ | ✅ |
| GET | /api/v1/memos/{id} | show | ✅ | ✅ |
| GET | /memos/{id}/edit | edit | ✅ | ❌ |
| PUT/PATCH | /api/v1/memos/{id} | update | ✅ | ✅ |
| DELETE | /api/v1/memos/{id} | destroy | ✅ | ✅ |

`php artisan route:list` で確認できます:

```bash
docker compose exec backend php artisan route:list --path=api
```

### 5.3 Controller — JSON レスポンス vs redirect

**Blade 方式の store (作成):**

```php
public function store(MemoRequest $request)
{
    $request->user()->memos()->create($request->validated());

    return redirect()->route('memos.index')->with('success', 'メモを作成しました');
}
```

**API 方式の store (作成):**

```php
public function store(MemoRequest $request): JsonResponse
{
    $memo = $request->user()->memos()->create($request->validated());

    return (new MemoResource($memo))->response()->setStatusCode(201);
}
```

**違いは最後の1行だけです:**
- Blade: `redirect()` でページ遷移 + flash メッセージ
- API: `MemoResource` 経由でキャメルケースの JSON を返す + HTTP ステータスコード

FormRequest (`MemoRequest`) は Blade 方式と同じものがそのまま使えます。
`messages()` メソッドで日本語のバリデーションメッセージを定義しています:

```php
class MemoRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'body'  => ['required', 'string', 'max:10000'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'タイトルは必須です。',
            'title.max'      => 'タイトルは255文字以内で入力してください。',
            'body.required'  => '本文は必須です。',
            'body.max'       => '本文は10000文字以内で入力してください。',
            // ...
        ];
    }
}
```

バリデーションに失敗した場合の挙動:
- **Blade 方式:** 自動で前のページにリダイレクト + `$errors` にエラーメッセージ
- **API 方式:** 自動で `422` ステータスコード + JSON でエラーメッセージ

この切り替えは Laravel が `Accept: application/json` ヘッダーや `X-Requested-With: XMLHttpRequest` を
見て自動的に判断してくれます。あなたが何かする必要はありません。

#### 認可 — Policy で「誰のメモか？」を判定する

「このメモはログインユーザーのものか？」という認可ロジックは **Policy** に切り出します。
コントローラーに `if ($memo->user_id !== ...)` を毎回書くのではなく、
ルールを一箇所にまとめることで保守性が上がります。

**Policy の定義** (`app/Policies/MemoPolicy.php`):

```php
class MemoPolicy
{
    public function view(User $user, Memo $memo): bool
    {
        return $user->id === $memo->user_id;
    }

    public function update(User $user, Memo $memo): bool
    {
        return $user->id === $memo->user_id;
    }

    public function delete(User $user, Memo $memo): bool
    {
        return $user->id === $memo->user_id;
    }
}
```

Policy は `php artisan make:policy MemoPolicy --model=Memo` で生成できます。
Laravel は `MemoPolicy` と `Memo` モデルの名前を自動で紐付けるため、手動の登録は不要です。

**Controller 側の呼び出し:**

```php
public function update(MemoRequest $request, Memo $memo): MemoResource
{
    $this->authorize('update', $memo);

    $memo->update($request->validated());

    return new MemoResource($memo);
}
```

`$this->authorize('update', $memo)` は、`MemoPolicy::update()` を呼び出し、
`false` が返った場合は自動で `403 Forbidden` レスポンスを返します。
Blade 方式でも全く同じ `$this->authorize()` が使えます — Policy は API/Blade 共通の仕組みです。

### 5.4 API Resource とレスポンス形式

このプロジェクトでは `JsonResource` (API Resource) を使ってレスポンスの形式を制御しています。

```php
// app/Http/Resources/MemoResource.php
class MemoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'        => $this->id,
            'userId'    => $this->user_id,     // スネーク → キャメル
            'title'     => $this->title,
            'body'      => $this->body,
            'createdAt' => $this->created_at,   // スネーク → キャメル
            'updatedAt' => $this->updated_at,
        ];
    }
}
```

**API Resource を使う理由:**
- DB のカラム名 (スネークケース: `user_id`) を JS の慣例 (キャメルケース: `userId`) に変換
- レスポンスに含めるフィールドを明示的に制御 (不要な内部情報の漏洩を防ぐ)
- `{ "data": { ... } }` 形式のラッパーが自動で付与される (ページネーション等との一貫性)

※ このプロジェクトでは Laravel 標準の `data` ラッパーを使います。
`JsonResource::withoutWrapping()` を使うと `data` ラッパーを外すこともできますが、
今回はフロントエンドの `ResourceResponse<T>` 型と対応させるため標準形式のままにしています。

主なステータスコード:

| コード | 意味 | 使い所 |
|--------|------|--------|
| 200 | OK | 取得・更新成功 |
| 201 | Created | 新規作成成功 |
| 204 | No Content | 削除成功 (レスポンスボディなし) |
| 401 | Unauthorized | 未認証 (ログインしていない) |
| 403 | Forbidden | 権限なし (他人のメモ) |
| 422 | Unprocessable Entity | バリデーションエラー |

---

## 6. フロントエンド (React + axios)

この章では **axios で API を呼び出す部分** に焦点を当てます。
React 自体の解説 (コンポーネント、hooks、状態管理) は対象外です。

### 6.1 axios の設定

```typescript
// frontend/src/lib/axios.ts
import axios, { AxiosError, AxiosResponse } from 'axios';
import type { ApiErrorResponse } from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// API エラーの型ガード — response が必ず存在することを保証する
type ApiError = AxiosError<ApiErrorResponse> & {
  response: AxiosResponse<ApiErrorResponse>;
};

export function isApiError(err: unknown): err is ApiError {
  return axios.isAxiosError(err) && err.response !== undefined;
}

// Sanctum の CSRF Cookie を取得する
// /sanctum/csrf-cookie は Sanctum 固定パスのため、baseURL を経由せず素の axios で呼ぶ
export async function getCsrfCookie(): Promise<void> {
  await axios.get('/sanctum/csrf-cookie', { withCredentials: true });
}

export default api;
```

| 設定 | 役割 |
|------|------|
| `baseURL: '/api/v1'` | 全リクエストに `/api/v1` プレフィックスを付与。バージョン変更時はここだけ修正 |
| `withCredentials: true` | Cookie (セッション + XSRF-TOKEN) をリクエストに含める |
| `withXSRFToken: true` | `XSRF-TOKEN` Cookie を自動で `X-XSRF-TOKEN` ヘッダーに付与する (Sanctum 公式推奨) |
| `Accept: application/json` | Laravel にJSON レスポンスを要求する。バリデーションエラーや未認証時に HTML ではなく JSON が返る |
| `X-Requested-With: XMLHttpRequest` | Laravel に「通常のページ遷移ではなく JavaScript からのリクエスト」であることを伝える補助ヘッダー |

**補足:** Sanctum のステートフル判定で主に重要なのは `SANCTUM_STATEFUL_DOMAINS` と `Origin` / `Referer` ヘッダーです。
`X-Requested-With` は補助的な役割であり、ステートフル判定の主役ではありません。

| エクスポート | 役割 |
|------|------|
| `api` (default) | Cookie 認証設定済みの axios インスタンス |
| `isApiError()` | catch ブロックで `err.response.data` に型安全にアクセスするための型ガード |
| `getCsrfCookie()` | Sanctum の CSRF Cookie 取得。認証リクエスト前に呼び出す |

`getCsrfCookie()` は素の `axios` (baseURL なし) で `/sanctum/csrf-cookie` を叩きます。
Sanctum の固定パスなので `api` インスタンスの `baseURL: '/api/v1'` を経由させません。
CSRF Cookie 取得のロジックがこの関数に閉じ込められているため、呼び出し側は `await getCsrfCookie()` だけで済みます。

**CSRF 対策について:**
Blade では `<form>` 内に `@csrf` を書いていましたが、API 方式では仕組みが変わります。

1. `getCsrfCookie()` で `/sanctum/csrf-cookie` にアクセスすると、Laravel が `XSRF-TOKEN` Cookie を発行
2. axios が `withXSRFToken: true` の設定に従い、Cookie を自動で `X-XSRF-TOKEN` ヘッダーに付けてリクエストを送信
3. Laravel がヘッダーの値と Cookie の値を比較して CSRF チェック

つまり、**axios が自動で処理してくれる** ので、あなたが手動で何かする必要はほとんどありません。
ログイン・登録前に一度 `getCsrfCookie()` を呼ぶだけです。

### 6.2 API 呼び出しパターン

#### レスポンスの型定義

API Resource を使うと、レスポンスは `{ "data": { ... } }` 形式になります。
フロントエンド側では `ResourceResponse<T>` ジェネリクス型でこのラッパーを表現します:

```typescript
// frontend/src/types.ts
interface ResourceResponse<T> {
  data: T;
}
```

#### ログインの流れ

```typescript
import api, { getCsrfCookie } from '../lib/axios';

const handleLogin = async () => {
  // Step 1: CSRF Cookie を取得
  await getCsrfCookie();

  // Step 2: ログイン → /api/v1/login に送信される (baseURL が自動付与)
  const res = await api.post<ResourceResponse<User>>('/login', { email, password });

  // Step 3: ログイン成功 → ユーザー情報を取得
  // axios の res.data = { data: { id, name, ... } } なので .data.data でアクセス
  const user = res.data.data; // { id: 1, name: "テストユーザー", ... }
};
```

#### メモの CRUD 操作

```typescript
// 一覧取得 → /api/v1/memos
const res = await api.get<ResourceResponse<Memo[]>>('/memos');
const memos = res.data.data; // Memo の配列 (キャメルケース: userId, createdAt, ...)

// 新規作成 → /api/v1/memos
await api.post<ResourceResponse<Memo>>('/memos', {
  title: 'メモのタイトル',
  body: 'メモの本文',
});

// 更新 → /api/v1/memos/{id}
await api.put<ResourceResponse<Memo>>(`/memos/${memo.id}`, {
  title: '更新後のタイトル',
  body: '更新後の本文',
});

// 削除 → /api/v1/memos/{id}
await api.delete<void>(`/memos/${memo.id}`);
```

#### バリデーションエラーのハンドリング

```typescript
import api, { isApiError } from '../lib/axios';

try {
  await api.post<ResourceResponse<Memo>>('/memos', { title: '', body: '' });
} catch (err) {
  if (isApiError(err)) {
    const { status, data } = err.response;
    if (status === 422 && data.errors) {
      // data.errors = { title: ["タイトルは必須です。"], body: ["本文は必須です。"] }
      // → 型安全: data は ApiErrorResponse 型に絞り込まれている
    }
  }
}
```

`isApiError()` 型ガードを通すことで、`err.response.data` が `ApiErrorResponse` 型に絞り込まれ、
`.errors` や `.message` に型安全にアクセスできます。

API が `422` を返した場合、`data.errors` にフィールドごとの日本語エラーメッセージが入っています。
これは Blade の `$errors->get('title')` と同じ情報を JSON 形式で受け取っているだけです。

### 6.3 React の解説はここまで

このドキュメントでは React の解説はここまでとします。
コンポーネントの設計、hooks (`useState`, `useEffect`)、TypeScript の型定義など、
React 自体の学習には以下のリソースを参照してください:

- [React 公式ドキュメント (日本語)](https://ja.react.dev/)
- [TypeScript 公式ハンドブック](https://www.typescriptlang.org/docs/)

---

## 7. テスト方法

### curl で API を叩いてみる

フロントエンドを使わずに、コマンドラインから API の動作を確認できます。

```bash
# 1. CSRF Cookie を取得 (Origin ヘッダーが必要 — Sanctum がステートフル判定に使う)
curl -c cookies.txt \
  -H "Origin: http://localhost:40081" \
  http://localhost:40081/sanctum/csrf-cookie

# 2. Cookie ファイルから XSRF-TOKEN を取得 (URL デコードが必要)
TOKEN=$(grep XSRF-TOKEN cookies.txt | awk '{print $NF}' \
  | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))")

# 3. ユーザー登録
curl -b cookies.txt -c cookies.txt \
  -X POST http://localhost:40081/api/v1/register \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Origin: http://localhost:40081" \
  -H "X-XSRF-TOKEN: ${TOKEN}" \
  -d '{"name":"Test","email":"curl@example.com","password":"password","password_confirmation":"password"}'

# 4. メモ作成 (ログイン後は Cookie が更新されるので TOKEN を再取得)
TOKEN=$(grep XSRF-TOKEN cookies.txt | awk '{print $NF}' \
  | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))")

curl -b cookies.txt -c cookies.txt \
  -X POST http://localhost:40081/api/v1/memos \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Origin: http://localhost:40081" \
  -H "X-XSRF-TOKEN: ${TOKEN}" \
  -d '{"title":"curl からのメモ","body":"APIが動いている！"}'

# 5. メモ一覧取得 (GET は CSRF 不要)
curl -b cookies.txt \
  -H "Accept: application/json" \
  -H "Origin: http://localhost:40081" \
  http://localhost:40081/api/v1/memos
```

**curl でのテスト時の注意点:**
- **`Origin` ヘッダー**: ブラウザは自動で付けますが、curl では手動で指定が必要です。
  Sanctum はこのヘッダーを見てステートフルリクエストかを判定し、セッションミドルウェアを適用します。
- **XSRF-TOKEN の URL デコード**: Cookie の値は URL エンコードされているため、
  `X-XSRF-TOKEN` ヘッダーに設定する前にデコードが必要です。
  ブラウザの axios はこれを自動で行います。

### ブラウザでの確認

1. `http://localhost:40081` にアクセス (自動で `/memos` にリダイレクト → 未認証なら `/login` へ)
2. テストユーザー (`test@example.com` / `password`) でログイン → `/memos` に遷移
3. メモの作成 (`/memos/new`)・一覧表示 (`/memos`)・編集 (`/memos/{id}/edit`)・削除を操作
4. ログアウト → `/login` に遷移

---

## 8. よくある疑問 (FAQ)

### Q: なぜ API トークン (Bearer token) を使わないの？

**A:** 同一オリジンの SPA では Cookie/Session 認証の方がシンプルで安全です。

- Cookie は **ブラウザが自動で送ってくれる** ので、トークンの保管場所を気にする必要がない
- `HttpOnly` Cookie はJavaScript から読めないので、XSS でトークンが盗まれるリスクが低い
- API トークンは **モバイルアプリ** や **外部サービスとの連携** など、Cookie が使えない場面で使います

### Q: Blade の `@csrf` はどこに行った？

**A:** `XSRF-TOKEN` Cookie + `X-XSRF-TOKEN` ヘッダーが同じ役割を果たしています。

- Blade: サーバーが `@csrf` でトークンを HTML に埋め込み → フォーム送信時にトークンが送られる
- API: サーバーが `XSRF-TOKEN` Cookie を発行 → axios が自動でヘッダーに付けて送信

仕組みは違いますが、「リクエスト元が正当か検証する」という目的は同じです。

### Q: `422` エラーが返ってきたら？

**A:** バリデーションエラーです。`error.response.data.errors` にフィールドごとのエラーメッセージが入っています。

```json
{
  "message": "タイトルは必須です。",
  "errors": {
    "title": ["タイトルは必須です。"],
    "body": ["本文は必須です。"]
  }
}
```

これは Blade の `$errors` と同じ情報です。フォーマットが JSON になっただけです。

### Q: Blade と API を混在させることはできる？

**A:** はい。`routes/web.php` に Blade 用のルートを、`routes/api_v1.php` に API ルートを書けば共存できます。
実際の業務では「管理画面は Blade、ユーザー向けは SPA」のような構成もよくあります。

### Q: CORS エラーが出たら？

**A:** このプロジェクトは同一オリジン構成なので通常は発生しません。
もし出た場合は以下を確認:

1. `config/cors.php` の `supports_credentials` が `true` か
2. `.env` の `SANCTUM_STATEFUL_DOMAINS` にアクセス元のドメイン:ポートが含まれているか
3. axios の `withCredentials` が `true` か

---

## 9. まとめ

### 要点の振り返り

1. **バックエンドのロジックは同じ** — Eloquent、バリデーション、認証 (`Auth::attempt` 等) は Blade でも API でも変わりません
2. **違うのはレスポンスの形式** — `return view(...)` の代わりに API Resource (キャメルケースJSON)
3. **CSRF の仕組みが変わる** — `@csrf` の代わりに Cookie + axios の自動ヘッダーで対処
4. **フロントエンドが UI を担当** — サーバーは JSON を返すだけ。画面描画は React (JavaScript) の仕事

### 次のステップ

- **テスト**: `$this->postJson()`, `$this->actingAs($user)->getJson()` で API のテストを書く
- **ページネーション**: `->paginate(15)` でページ分割し、フロントでページ送りを実装
