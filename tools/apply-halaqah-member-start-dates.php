<?php

declare(strict_types=1);

// Jalankan 025 saja: migrasi 016-023 pada database production belum tercatat.
use App\Core\Database;
use App\Core\Env;

$root = dirname(__DIR__);
$backend = $root . '/src/backend';
require_once $backend . '/app/Core/Env.php';
require_once $backend . '/app/Core/Database.php';

Env::load($backend . '/.env', override: true, required: true);
$pdo = Database::connection();
$file = $backend . '/database/migrations/20261106_025_halaqah_member_start_dates.php';
$migration = require $file;

$lock = 'metodequ_schema_migration';
$lockStmt = $pdo->prepare('SELECT GET_LOCK(?, 30)');
$lockStmt->execute([$lock]);
if ((int) $lockStmt->fetchColumn() !== 1) {
    throw new RuntimeException('Migration lock tidak tersedia.');
}

try {
    $expected = [
        ['table' => 'halaqahs', 'column' => 'start_date_mode'],
        ['table' => 'halaqah_memberships', 'column' => 'program_start_date'],
    ];
    $check = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?'
    );
    $checksum = hash_file('sha256', $file);
    $migrationRow = $pdo->prepare('SELECT checksum FROM schema_migrations WHERE migration_id = ?');
    $migrationRow->execute([$migration['id']]);
    $old = $migrationRow->fetchColumn();
    if ($old !== false && !hash_equals((string) $old, $checksum)) {
        throw new RuntimeException('Checksum migrasi sudah berubah.');
    }
    foreach ($expected as $i => $field) {
        $check->execute([$field['table'], $field['column']]);
        if ((int) $check->fetchColumn() === 0) {
            $pdo->exec($migration['up'][$i]);
            echo $field['table'] . '.' . $field['column'] . "=ADDED\n";
        } else {
            echo $field['table'] . '.' . $field['column'] . "=EXISTS\n";
        }
    }
    $mode = $pdo->query(
        "SELECT column_type, column_default FROM information_schema.columns
         WHERE table_schema=DATABASE() AND table_name='halaqahs' AND column_name='start_date_mode'"
    )->fetch(PDO::FETCH_ASSOC);
    $mode = is_array($mode) ? array_change_key_case($mode, CASE_LOWER) : null;
    $member = $pdo->query(
        "SELECT data_type FROM information_schema.columns
         WHERE table_schema=DATABASE() AND table_name='halaqah_memberships' AND column_name='program_start_date'"
    )->fetch(PDO::FETCH_ASSOC);
    $member = is_array($member) ? array_change_key_case($member, CASE_LOWER) : null;
    if (!$mode || $mode['column_type'] !== "enum('shared','individual')" ||
        $mode['column_default'] !== 'shared' || !$member || $member['data_type'] !== 'date') {
        throw new RuntimeException('Verifikasi tipe kolom gagal.');
    }
    if ($old === false) {
        $record = $pdo->prepare(
            'INSERT INTO schema_migrations (migration_id,description,checksum) VALUES (?,?,?)'
        );
        $record->execute([$migration['id'], $migration['description'], $checksum]);
    }
    echo 'MIGRATION_025=APPLIED' . PHP_EOL;
} finally {
    $release = $pdo->prepare('SELECT RELEASE_LOCK(?)');
    $release->execute([$lock]);
}
