<?php

declare(strict_types=1);

use App\Core\Database;
use App\Core\Env;

$root = dirname(__DIR__);
$backend = $root . '/src/backend';
require_once $backend . '/app/Core/Env.php';
require_once $backend . '/app/Core/Database.php';
Env::load($backend . '/.env', override: true, required: true);
$pdo = Database::connection();
$file = $backend . '/database/migrations/20261107_027_halaqah_daily_target_pages.php';
$migration = require $file;
$checksum = hash_file('sha256', $file);
$lockName = 'metodequ_schema_migration';
$lock = $pdo->prepare('SELECT GET_LOCK(?, 30)');
$lock->execute([$lockName]);
if ((int) $lock->fetchColumn() !== 1) {
    throw new RuntimeException('Schema lock tidak tersedia.');
}
try {
    $existing = $pdo->prepare('SELECT checksum FROM schema_migrations WHERE migration_id = ?');
    $existing->execute([$migration['id']]);
    $oldChecksum = $existing->fetchColumn();
    if ($oldChecksum !== false && !hash_equals((string) $oldChecksum, $checksum)) {
        throw new RuntimeException('Checksum migrasi berbeda.');
    }
    $column = $pdo->query(
        "SELECT DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE, IS_NULLABLE
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'halaqahs'
           AND COLUMN_NAME = 'daily_target_pages'"
    )->fetch(PDO::FETCH_ASSOC);
    if (!$column) {
        $pdo->exec($migration['up'][0]);
        $column = $pdo->query(
            "SELECT DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE, IS_NULLABLE
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'halaqahs'
               AND COLUMN_NAME = 'daily_target_pages'"
        )->fetch(PDO::FETCH_ASSOC);
    }
    if (!$column || $column['DATA_TYPE'] !== 'decimal' ||
        (int) $column['NUMERIC_PRECISION'] !== 5 ||
        (int) $column['NUMERIC_SCALE'] !== 2 ||
        $column['IS_NULLABLE'] !== 'YES') {
        throw new RuntimeException('Struktur kolom target halaqah tidak sesuai.');
    }
    if ($oldChecksum === false) {
        $insert = $pdo->prepare(
            'INSERT INTO schema_migrations (migration_id, description, checksum) VALUES (?, ?, ?)'
        );
        $insert->execute([$migration['id'], $migration['description'], $checksum]);
    }
    echo "MIGRATION_027=PASS\n";
} finally {
    $release = $pdo->prepare('SELECT RELEASE_LOCK(?)');
    $release->execute([$lockName]);
}
