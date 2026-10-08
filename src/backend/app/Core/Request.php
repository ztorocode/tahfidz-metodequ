<?php

declare(strict_types=1);

namespace App\Core;

final class Request
{
    private function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public readonly array $headers,
        private readonly array $body,
    ) {
    }

    public static function capture(): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $rawBody = file_get_contents('php://input') ?: '';
        $body = [];

        if ($rawBody !== '') {
            try {
                $decoded = json_decode($rawBody, true, flags: JSON_THROW_ON_ERROR);
                $body = is_array($decoded) ? $decoded : [];
            } catch (\JsonException) {
                $body = [];
            }
        }

        return new self(
            method: $method,
            path: rtrim($path, '/') ?: '/',
            query: $_GET,
            headers: self::headers(),
            body: $body,
        );
    }

    public function body(): array
    {
        return $this->body;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    private static function headers(): array
    {
        if (function_exists('getallheaders')) {
            return array_change_key_case(getallheaders() ?: [], CASE_LOWER);
        }

        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (!str_starts_with($key, 'HTTP_')) {
                continue;
            }

            $name = strtolower(str_replace('_', '-', substr($key, 5)));
            $headers[$name] = $value;
        }

        return $headers;
    }
}
