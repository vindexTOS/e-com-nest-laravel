FROM php:8.5-fpm-alpine AS base

WORKDIR /var/www/html

RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libzip-dev \
    zip \
    unzip \
    oniguruma-dev \
    postgresql-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    nodejs \
    npm

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo_pgsql pgsql mbstring exif pcntl bcmath gd zip

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

FROM base AS dependencies

COPY composer.json ./
RUN composer update --no-dev --optimize-autoloader --no-interaction --prefer-dist --no-scripts --ignore-platform-reqs

COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps || npm install

FROM base AS build

COPY --from=dependencies /var/www/html/vendor ./vendor
COPY --from=dependencies /var/www/html/node_modules ./node_modules

COPY . .

RUN rm -rf bootstrap/cache/*.php \
    && mkdir -p bootstrap/cache \
    && composer dump-autoload --optimize --no-interaction \
    && php artisan package:discover --ansi || true \
    && php -r "if(file_exists('bootstrap/cache/packages.php')) { \$packages = require 'bootstrap/cache/packages.php'; \$devPackages = ['laravel/pail', 'laravel/sail', 'nunomaduro/collision', 'nunomaduro/termwind']; \$filtered = array_diff_key(\$packages, array_flip(\$devPackages)); file_put_contents('bootstrap/cache/packages.php', '<?php return ' . var_export(\$filtered, true) . ';'); }"

# Always rebuild frontend assets
# Force rebuild frontend assets - remove old build first
RUN rm -rf public/build && npm run build || (npm install && npm run build)

FROM php:8.5-fpm-alpine AS production

WORKDIR /var/www/html

RUN apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS \
    libpng-dev \
    libzip-dev \
    oniguruma-dev \
    postgresql-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    && apk add --no-cache \
    libpng \
    libzip \
    oniguruma \
    postgresql-libs \
    freetype \
    libjpeg-turbo \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo_pgsql pgsql mbstring exif pcntl bcmath gd zip \
    && apk del .build-deps

COPY --from=dependencies /var/www/html/vendor ./vendor
COPY --from=build /var/www/html/public/build ./public/build
COPY --from=build /var/www/html/app ./app
COPY --from=build /var/www/html/bootstrap ./bootstrap
COPY --from=build /var/www/html/config ./config
COPY --from=build /var/www/html/database ./database
COPY --from=build /var/www/html/public ./public
COPY --from=build /var/www/html/resources ./resources
COPY --from=build /var/www/html/routes ./routes
COPY --from=build /var/www/html/storage ./storage
COPY --from=build /var/www/html/artisan ./artisan
COPY --from=build /var/www/html/composer.json ./composer.json
COPY --from=build /var/www/html/composer.lock ./composer.lock
COPY --from=build /var/www/html/tsconfig.json ./tsconfig.json
COPY --from=build /var/www/html/tsconfig.node.json ./tsconfig.node.json
COPY --from=build /var/www/html/vite.config.js ./vite.config.js

RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache

EXPOSE 8000

CMD sh -c "php artisan config:clear && php artisan cache:clear && rm -f /var/www/html/bootstrap/cache/config.php && php artisan storage:link || true && php artisan serve --host=0.0.0.0 --port=8000"
