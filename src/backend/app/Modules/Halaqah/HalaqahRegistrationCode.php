<?php

declare(strict_types=1);

namespace App\Modules\Halaqah;

use PDO;
use PDOException;
use RuntimeException;

/**
 * Kode registrasi adalah identitas permanen, bukan ID auto-increment.
 * Karakter menghindari O/0 dan I/1 untuk mengurangi salah ketik.
 */
final class HalaqahRegistrationCode
{
    private const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    private const DIGITS = '23456789';
    private const ALPHABET = self::LETTERS . self::DIGITS;
    private const UNIQUE_KEY = 'uq_halaqahs_registration_code';

    public static function generate(): string
    {
        $chars = [
            self::LETTERS[random_int(0, strlen(self::LETTERS) - 1)],
            self::DIGITS[random_int(0, strlen(self::DIGITS) - 1)],
        ];
        for ($i = 2; $i < 6; ++$i) {
            $chars[] = self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
        }
        // Fisher-Yates, dengan RNG kriptografis.
        for ($i = count($chars) - 1; $i > 0; --$i) {
            $j = random_int(0, $i);
            [$chars[$i], $chars[$j]] = [$chars[$j], $chars[$i]];
        }
        return implode('', $chars);
    }

    public static function isCollision(PDOException $exception): bool
    {
        return (int) ($exception->errorInfo[1] ?? 0) === 1062 &&
            str_contains($exception->getMessage(), self::UNIQUE_KEY);
    }

    /** INSERT SQL wajib menyertakan placeholder :registration_code. */
    public static function insert(PDO $pdo, string $sql, array $parameters): int
    {
        for ($attempt = 0; $attempt < 20; ++$attempt) {
            try {
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ...$parameters,
                    'registration_code' => self::generate(),
                ]);
                return (int) $pdo->lastInsertId();
            } catch (PDOException $e) {
                if (!self::isCollision($e)) {
                    throw $e;
                }
            }
        }
        throw new RuntimeException('Gagal membuat kode halaqah unik setelah beberapa percobaan.');
    }

    /** Untuk data lama; unique index mencegah kode kembar antar proses. */
    public static function fillMissing(PDO $pdo): int
    {
        $ids = $pdo->query('SELECT id FROM halaqahs WHERE registration_code IS NULL ORDER BY id')
            ->fetchAll(PDO::FETCH_COLUMN);
        $updated = 0;
        $stmt = $pdo->prepare(
            'UPDATE halaqahs SET registration_code = :registration_code
             WHERE id = :id AND registration_code IS NULL'
        );
        foreach ($ids as $id) {
            $completed = false;
            for ($attempt = 0; $attempt < 20; ++$attempt) {
                try {
                    $stmt->execute(['id' => (int) $id, 'registration_code' => self::generate()]);
                    $updated += $stmt->rowCount();
                    $completed = true;
                    break;
                } catch (PDOException $e) {
                    if (!self::isCollision($e)) {
                        throw $e;
                    }
                }
            }
            if (!$completed) {
                throw new RuntimeException('Gagal membuat kode unik untuk salah satu halaqah.');
            }
        }
        return $updated;
    }
}
