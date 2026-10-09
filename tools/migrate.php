<?php

declare(strict_types=1);

use App\Core\Database;
use App\Core\Env;
use PDO;
use Throwable;

$root = dirname(__DIR__);
$backendDir = $root . '/src/backend';
$migrationsDir = $backendDir . '/database/migrations';
$envFile = $backendDir . '/.env';

require_once $backendDir . '/app/Core/Env.php';
require_once $backendDir . '/app/Core/Database.php';

function out(string $message = ''): void
{
    fwrite(STDOUT, $message . PHP_EOL);
}

function failMigration(string $message, int $code = 1): never
{
    fwrite(STDERR, $message . PHP_EOL);
    exit($code);
}

function migrationTableExists(PDO $pdo): bool
{
    $statement = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?'
    );
    $statement->execute(['schema_migrations']);

    return (int) $statement->fetchColumn() > 0;
}

function ensureMigrationTable(PDO $pdo): void
{
    $pdo->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_id VARCHAR(190) NOT NULL,
    description VARCHAR(255) NOT NULL,
    checksum CHAR(64) NOT NULL,
    applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (migration_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
}

function discoverMigrations(string $directory): array
{
    $files = glob($directory . '/*.php');
    if ($files === false) {
        return [];
    }

    sort($files, SORT_STRING);

    $migrations = [];
    foreach ($files as $file) {
        $migration = require $file;

        if (
            !is_array($migration)
            || !isset($migration['id'], $migration['description'], $migration['up'])
            || !is_string($migration['id'])
            || !is_string($migration['description'])
            || !is_array($migration['up'])
        ) {
            throw new RuntimeException('Invalid migration file: ' . basename($file));
        }

        $migrations[] = [
            ...$migration,
            'file' => $file,
            'checksum' => hash_file('sha256', $file),
        ];
    }

    return $migrations;
}

try {
    Env::load($envFile, override: true, required: true);
    $pdo = Database::connection();
} catch (Throwable $exception) {
    failMigration('Database initialization failed: ' . $exception->getMessage(), 2);
}

$mode = 'apply';
if (in_array('--status', $argv, true)) {
    $mode = 'status';
} elseif (in_array('--dry-run', $argv, true)) {
    $mode = 'dry-run';
}

try {
    $migrations = discoverMigrations($migrationsDir);
    $hasTable = migrationTableExists($pdo);

    $applied = [];
    if ($hasTable) {
        foreach ($pdo->query('SELECT migration_id, checksum, applied_at FROM schema_migrations ORDER BY migration_id') as $row) {
            $applied[$row['migration_id']] = $row;
        }
    }

    out('MetodeQu - Database Migration');
    out('Database : ' . ($pdo->query('SELECT DATABASE()')->fetchColumn() ?: '(none)'));
    out('Mode     : ' . $mode);
    out();

    $pending = [];
    foreach ($migrations as $migration) {
        $existing = $applied[$migration['id']] ?? null;

        if ($existing !== null) {
            if (!hash_equals((string) $existing['checksum'], (string) $migration['checksum'])) {
                failMigration(
                    'Checksum mismatch for applied migration ' . $migration['id'] . '. Refusing to continue.',
                    3
                );
            }

            out('[applied] ' . $migration['id'] . ' - ' . $migration['description']);
            continue;
        }

        $pending[] = $migration;
        out('[pending] ' . $migration['id'] . ' - ' . $migration['description']);
    }

    if ($mode !== 'apply') {
        out();
        out('Pending migrations: ' . count($pending));
        exit(0);
    }

    if ($pending === []) {
        out();
        out('No pending migrations.');
        exit(0);
    }

    ensureMigrationTable($pdo);

    $lockName = 'metodequ_schema_migration';
    $lockStatement = $pdo->prepare('SELECT GET_LOCK(?, 30)');
    $lockStatement->execute([$lockName]);

    if ((int) $lockStatement->fetchColumn() !== 1) {
        failMigration('Could not acquire migration lock.', 4);
    }

    try {
        foreach ($pending as $migration) {
            out();
            out('Applying ' . $migration['id'] . ' ...');

            foreach ($migration['up'] as $index => $sql) {
                if (!is_string($sql) || trim($sql) === '') {
                    throw new RuntimeException(
                        'Invalid SQL statement #' . ($index + 1) . ' in ' . $migration['id']
                    );
                }

                try {
                    $pdo->exec($sql);
                } catch (Throwable $exception) {
                    throw new RuntimeException(
                        'Migration ' . $migration['id'] . ' failed at statement #' . ($index + 1)
                        . ': ' . $exception->getMessage(),
                        0,
                        $exception
                    );
                }
            }

            $insert = $pdo->prepare(
                'INSERT INTO schema_migrations (migration_id, description, checksum) VALUES (?, ?, ?)'
            );
            $insert->execute([
                $migration['id'],
                $migration['description'],
                $migration['checksum'],
            ]);

            out('Applied ' . $migration['id']);
        }
    } finally {
        $releaseStatement = $pdo->prepare('SELECT RELEASE_LOCK(?)');
        $releaseStatement->execute([$lockName]);
    }

    out();
    out('Migration complete.');
} catch (Throwable $exception) {
    failMigration($exception->getMessage(), 5);
}
