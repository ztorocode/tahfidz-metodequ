<?php

declare(strict_types=1);

namespace App\Core;

final class Env
{
    public static function load(
        string $path,
        bool $override = true,
        bool $required = false,
    ): void {
        if (!is_file($path)) {
            if ($required) {
                throw new \RuntimeException('Environment file not found: ' . $path);
            }

            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES);
        if ($lines === false) {
            throw new \RuntimeException('Unable to read environment file: ' . $path);
        }

        foreach ($lines as $line) {
            $line = trim($line);

            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            if (str_starts_with($line, 'export ')) {
                $line = trim(substr($line, 7));
            }

            if (!str_contains($line, '=')) {
                continue;
            }

            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);

            if (!preg_match('/^[A-Z_][A-Z0-9_]*$/i', $key)) {
                continue;
            }

            $value = self::parseValue($value);

            if (!$override && getenv($key) !== false) {
                continue;
            }

            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }

    private static function parseValue(string $value): string
    {
        if (strlen($value) >= 2) {
            $first = $value[0];
            $last = $value[strlen($value) - 1];

            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $value = substr($value, 1, -1);

                return $first === '"' ? stripcslashes($value) : $value;
            }
        }

        return preg_replace('/\s+#.*$/', '', $value) ?? $value;
    }
}
