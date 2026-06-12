<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to your application's "home" route.
     *
     * Typically, users are redirected here after authentication.
     *
     * @var string
     */
    public const HOME = '/home';

    /**
     * ルート定義とレートリミッターの設定
     *
     * API ルートはバージョンごとにファイルを分離し、個別のプレフィックスで読み込む。
     * 将来 v2 を追加する場合は routes/api_v2.php を作成し、ここに登録する。
     */
    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        $this->routes(function () {
            Route::middleware('api')
                ->prefix('api/v1')
                ->group(base_path('routes/api_v1.php'));

            // 将来のバージョン追加例:
            // Route::middleware('api')
            //     ->prefix('api/v2')
            //     ->group(base_path('routes/api_v2.php'));

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }
}
