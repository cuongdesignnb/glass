<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // CORS phải ở global level để OPTIONS preflight không bị block bởi router
        $middleware->prepend(\App\Http\Middleware\CorsMiddleware::class);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Đảm bảo CORS headers được thêm vào cả response lỗi (validation 422, 500, etc.)
        $exceptions->renderable(function (\Throwable $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                $origin = $request->header('Origin', '');
                $status = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;

                if ($e instanceof \Illuminate\Validation\ValidationException) {
                    $response = response()->json([
                        'message' => $e->getMessage(),
                        'errors' => $e->errors(),
                    ], 422);
                } else {
                    $response = response()->json([
                        'message' => $e->getMessage() ?: 'Server Error',
                    ], $status);
                }

                $response->headers->set('Access-Control-Allow-Origin', $origin ?: '*');
                $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
                $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
                if ($origin) {
                    $response->headers->set('Access-Control-Allow-Credentials', 'true');
                }

                return $response;
            }
        });
    })->create();
