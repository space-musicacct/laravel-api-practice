# laravel-api-practice

Laravel 10 API の学習用リポジトリ。レスマネと同じ構成をベースにしている。

## 技術スタック

| 技術 | バージョン |
|------|-----------|
| PHP | 8.3 (FPM Alpine) |
| Laravel | 10 |
| MySQL | 8.4 |
| Nginx | 1.27 |
| Composer | 2 (Docker) |

## 前提条件

- WSL2 (Ubuntu)
- Docker CE + docker-compose-plugin
- Git

## 環境構築

```bash
# 1. リポジトリをクローン
git clone git@github.com:space-musicacct/laravel-api-practice.git
cd laravel-api-practice

# 2. .env を作成
cp backend/.env.example backend/.env

# 3. コンテナをビルド・起動
docker compose up -d --build

# 4. Laravel 初期設定 (初回のみ)
docker compose exec backend chown -R www-data:www-data storage bootstrap/cache
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan migrate
```

## アクセス

| URL | 内容 |
|-----|------|
| http://localhost:40081 | Laravel API |
| localhost:43306 | MySQL (DB クライアントから接続) |

## よく使うコマンド

```bash
# 起動
docker compose up -d

# 停止
docker compose down

# コンテナ状態確認
docker compose ps

# ログ確認
docker compose logs -f

# 再ビルド
docker compose up -d --build

# artisan コマンド実行
docker compose exec backend php artisan <command>

# テスト実行
docker compose exec backend php artisan test
```

## Composer パッケージの管理

PHP / Composer はホストにインストールせず、すべて Docker コンテナ経由で実行する。
ホストに直接インストールすると環境を汚染し、バージョン差異で再現性が失われる。

### パッケージの追加・削除

`composer require` コマンドで直接入れるのではなく、**先に `composer.json` を編集してからビルドする。**
コマンド経由だとコミットし忘れて他の環境で再現できなくなるリスクがある。

```bash
# 1. composer.json の require / require-dev を手動で編集
# 2. vendor を再インストールしてリビルド
docker compose exec backend composer update
docker compose up -d --build
```
