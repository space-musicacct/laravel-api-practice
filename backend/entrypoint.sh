#!/bin/sh
cd /var/www/html

if [ ! -f .env ]; then
  cp .env.example .env
  php artisan key:generate
fi

composer install --no-interaction

chown -R www-data:www-data storage bootstrap/cache

exec php-fpm
