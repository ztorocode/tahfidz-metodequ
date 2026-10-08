<?php

declare(strict_types=1);

namespace App\Core;

final class Router
{
    /** @var array<string, array<string, callable>> */
    private array $routes = [];

    public function get(string $path, callable $handler): void
    {
        $this->add('GET', $path, $handler);
    }

    public function post(string $path, callable $handler): void
    {
        $this->add('POST', $path, $handler);
    }

    public function put(string $path, callable $handler): void
    {
        $this->add('PUT', $path, $handler);
    }

    public function delete(string $path, callable $handler): void
    {
        $this->add('DELETE', $path, $handler);
    }

    public function dispatch(Request $request): never
    {
        $handler = $this->routes[$request->method][$request->path] ?? null;

        if ($handler === null) {
            Response::json([
                'success' => false,
                'message' => 'Route not found',
            ], 404);
        }

        $result = $handler($request);

        if (is_array($result)) {
            Response::json($result);
        }

        Response::json([
            'success' => true,
            'data' => $result,
        ]);
    }

    private function add(string $method, string $path, callable $handler): void
    {
        $normalized = rtrim($path, '/') ?: '/';
        $this->routes[$method][$normalized] = $handler;
    }
}
