<?php

declare(strict_types=1);

use App\Core\Database;

$root = dirname(__DIR__);
$backendDir = $root . '/src/backend';
$envFile = $backendDir . '/.env';

function fail(string $message, int $code = 1): never
{
    fwrite(STDERR, $message . PHP_EOL);
    exit($code);
}

function loadEnvFile(string $path): void
{
    if (!is_file($path)) {
        fail('File .env tidak ditemukan: ' . $path);
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES);
    if ($lines === false) {
        fail('Gagal membaca file .env: ' . $path);
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

        if (strlen($value) >= 2) {
            $first = $value[0];
            $last = $value[strlen($value) - 1];

            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $value = substr($value, 1, -1);

                if ($first === '"') {
                    $value = stripcslashes($value);
                }
            }
        }

        if (getenv($key) !== false) {
            continue;
        }

        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}

loadEnvFile($envFile);

require_once $backendDir . '/app/Core/Database.php';

$driver = getenv('DB_DRIVER') ?: 'mysql';
$host = getenv('DB_HOST') ?: '127.0.0.1';
$port = getenv('DB_PORT') ?: '3306';
$database = getenv('DB_DATABASE') ?: 'metodequ';
$username = getenv('DB_USERNAME') ?: '';
$passwordConfigured = (getenv('DB_PASSWORD') ?: '') !== '';

echo "MetodeQu - Cek Koneksi Database" . PHP_EOL;
echo "--------------------------------" . PHP_EOL;
echo "Driver   : {$driver}" . PHP_EOL;
echo "Host     : {$host}:{$port}" . PHP_EOL;
echo "Database : {$database}" . PHP_EOL;
echo "Username : " . ($username !== '' ? $username : '(kosong)') . PHP_EOL;
echo "Password : " . ($passwordConfigured ? 'sudah di-set' : '(kosong)') . PHP_EOL;
echo PHP_EOL;

try {
    $pdo = Database::connection();
    $result = $pdo->query('SELECT 1')->fetchColumn();

    if ((int) $result !== 1) {
        fail('Koneksi berhasil, tetapi query SELECT 1 tidak menghasilkan nilai yang diharapkan.', 2);
    }

    $activeDatabase = $pdo->query('SELECT DATABASE()')->fetchColumn();

    echo "Koneksi   : OK" . PHP_EOL;
    echo "SELECT 1  : OK" . PHP_EOL;
    echo "DB aktif  : " . ($activeDatabase ?: '(tidak ada)') . PHP_EOL;
    exit(0);
} catch (Throwable $exception) {
    fwrite(STDERR, "Koneksi   : GAGAL" . PHP_EOL);
    fwrite(STDERR, "Error     : " . $exception->getMessage() . PHP_EOL);
    exit(2);
}
