<?php

declare(strict_types=1);

/**
 * Migrasi tertarget 024: tidak memicu migrasi pending lainnya.
 * Idempoten: dapat dijalankan ulang setelah gangguan DDL atau backfill.
 */
use App\Core\Database;
use App\Core\Env;
use App\Modules\Halaqah\HalaqahRegistrationCode;

$root = dirname(__DIR__);
$backend = $root . '/src/backend';
require_once $backend . '/app/Core/Env.php';
require_once $backend . '/app/Core/Database.php';
require_once $backend . '/app/Modules/Halaqah/HalaqahRegistrationCode.php';

Env::load($backend . '/.env', override: true, required: true);
$pdo = Database::connection();
$file = $backend . '/database/migrations/20261102_024_halaqah_registration_code.php';
$migration = require $file;

function hasColumn(PDO $pdo, string $name): bool
{
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'halaqahs' AND column_name = ?"
    );
    $stmt->execute([$name]);
    return (int) $stmt->fetchColumn() > 0;
}

function hasIndex(PDO $pdo, string $name): bool
{
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM information_schema.statistics
         WHERE table_schema = DATABASE() AND table_name = 'halaqahs' AND index_name = ?"
    );
    $stmt->execute([$name]);
    return (int) $stmt->fetchColumn() > 0;
}

$lock = 'metodequ_schema_migration';
$lockStmt = $pdo->prepare('SELECT GET_LOCK(?, 30)');
$lockStmt->execute([$lock]);
if ((int) $lockStmt->fetchColumn() !== 1) {
    throw new RuntimeException('Gagal mendapatkan migration lock.');
}
try {
    $column = hasColumn($pdo, 'registration_code');
    $index = hasIndex($pdo, 'uq_halaqahs_registration_code');
    if (!$column && !$index) {
        $pdo->exec($migration['up'][0]);
        echo "SCHEMA=CREATED\n";
    } elseif ($column && !$index) {
        $pdo->exec(
            'ALTER TABLE halaqahs ADD UNIQUE KEY uq_halaqahs_registration_code (registration_code)'
        );
        echo "SCHEMA=INDEX_CREATED\n";
    } elseif (!$column) {
        throw new RuntimeException('Index ditemukan tanpa kolom registration_code.');
    } else {
        echo "SCHEMA=EXISTS\n";
    }

    // Verifikasi tipe, panjang, dan indeks unik sebelum mengisi.
    $info = $pdo->query(
        "SELECT data_type AS code_type, character_maximum_length AS code_length,
                collation_name AS code_collation
         FROM information_schema.columns WHERE table_schema = DATABASE()
           AND table_name = 'halaqahs' AND column_name = 'registration_code'"
    )->fetch(PDO::FETCH_ASSOC);
    if (!$info || $info['code_type'] !== 'char' ||
        (int) $info['code_length'] !== 6 || $info['code_collation'] !== 'ascii_bin') {
        throw new RuntimeException('Tipe kolom kode tidak sesuai spesifikasi.');
    }
    $unique = $pdo->query(
        "SELECT MIN(non_unique) FROM information_schema.statistics
         WHERE table_schema = DATABASE() AND table_name = 'halaqahs'
           AND index_name = 'uq_halaqahs_registration_code'"
    )->fetchColumn();
    if ((int) $unique !== 0) {
        throw new RuntimeException('Kode belum dilindungi indeks UNIQUE.');
    }

    echo 'BACKFILLED=' . HalaqahRegistrationCode::fillMissing($pdo) . "\n";
    $invalid = $pdo->query(
        "SELECT COUNT(*) FROM halaqahs WHERE registration_code IS NULL
          OR registration_code NOT REGEXP '^[A-Z0-9]{6}$'
          OR registration_code NOT REGEXP '[A-Z]'
          OR registration_code NOT REGEXP '[0-9]'"
    )->fetchColumn();
    $total = $pdo->query('SELECT COUNT(*) FROM halaqahs')->fetchColumn();
    if ((int) $invalid !== 0) {
        throw new RuntimeException('Ada kode halaqah tidak valid: ' . $invalid);
    }
    echo "TOTAL=$total\nINVALID=$invalid\n";

    // Tandai migrasi 024 saja, tanpa mengganggu status migrasi 016-023.
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
         migration_id VARCHAR(190) NOT NULL, description VARCHAR(255) NOT NULL,
         checksum CHAR(64) NOT NULL,
         applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
         PRIMARY KEY (migration_id)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
    $checksum = hash_file('sha256', $file);
    $stmt = $pdo->prepare(
        'SELECT checksum FROM schema_migrations WHERE migration_id = ?'
    );
    $stmt->execute([$migration['id']]);
    $existing = $stmt->fetchColumn();
    if ($existing !== false && !hash_equals((string) $existing, $checksum)) {
        throw new RuntimeException('Checksum migrasi 024 tidak cocok.');
    }
    if ($existing === false) {
        $stmt = $pdo->prepare(
            'INSERT INTO schema_migrations (migration_id, description, checksum) VALUES (?, ?, ?)'
        );
        $stmt->execute([$migration['id'], $migration['description'], $checksum]);
    }
    echo "MIGRATION_024=APPLIED\n";
} finally {
    $release = $pdo->prepare('SELECT RELEASE_LOCK(?)');
    $release->execute([$lock]);
}
