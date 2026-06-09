#!/bin/sh
cd /var/www/html

composer install --no-interaction

if [ ! -f .env ]; then
  cp .env.example .env
fi

if grep -q "^APP_KEY=$" .env; then
  php artisan key:generate
fi

chown -R www-data:www-data storage bootstrap/cache

exec php-fpm
