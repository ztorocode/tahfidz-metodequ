<?php

declare(strict_types=1);

use App\Core\Database;
use App\Core\Env;

$root = dirname(__DIR__);
$backendDir = $root . '/src/backend';
$envFile = $backendDir . '/.env';

function fail(string $message, int $code = 1): never
{
    fwrite(STDERR, $message . PHP_EOL);
    exit($code);
}

require_once $backendDir . '/app/Core/Env.php';
require_once $backendDir . '/app/Core/Database.php';

try {
    Env::load($envFile, override: true, required: true);
} catch (Throwable $exception) {
    fail($exception->getMessage());
}

$driver = getenv('DB_DRIVER') ?: 'mysql';
$host = getenv('DB_HOST') ?: '127.0.0.1';
$port = getenv('DB_PORT') ?: '3306';
$database = getenv('DB_DATABASE') ?: 'metodequ';
$username = getenv('DB_USERNAME') ?: '';
$passwordConfigured = (getenv('DB_PASSWORD') ?: '') !== '';

echo "MetodeQu - Cek Koneksi Database" . PHP_EOL;
echo "--------------------------------" . PHP_EOL;
echo "Config    : src/backend/.env (override Pod env)" . PHP_EOL;
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
