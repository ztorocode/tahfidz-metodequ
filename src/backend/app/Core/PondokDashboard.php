<?php

declare(strict_types=1);

namespace App\Core;

use PDO;
use Throwable;

/**
 * Ringkasan dashboard siap pakai per pondok.
 *
 * Data mentah (halaqah, member, setoran, review) dihitung ulang ke tabel
 * pondok_dashboard sehingga halaman dashboard cukup membaca 1 baris.
 * - Event  : layanan yang menulis data memanggil refresh() sesudah tulis.
 * - Pengaman: summary() menghitung ulang bila refreshed_at lebih tua dari TTL,
 *   sehingga jalur tulis yang terlewat tetap ketolong.
 */
final class PondokDashboard
{
    private const TTL_SECONDS = 60;

    private const DECISION_LABELS = [
        'mutqin' => 'Mutqin',
        'cukup_stabil' => 'Cukup Stabil',
        'penguatan' => 'Penguatan',
        'ulang' => 'Perlu Ulang',
    ];

    /** Hitung ulang dari data mentah lalu tulis ke pondok_dashboard. */
    public static function refresh(PDO $pdo, int $pondokId): array
    {
        if ($pondokId < 1) {
            return self::emptySummary();
        }

        $count = static function (string $sql, int $pid) use ($pdo): int {
            $statement = $pdo->prepare($sql);
            $statement->execute(['pondok_id' => $pid]);
            return (int) $statement->fetchColumn();
        };

        $halaqah = $count(
            "SELECT COUNT(*) FROM halaqahs
             WHERE pondok_id = :pondok_id AND status = 'active' AND deleted_at IS NULL",
            $pondokId
        );
        $santri = $count(
            "SELECT COUNT(*) FROM pondok_memberships
             WHERE pondok_id = :pondok_id AND role = 'santri' AND status = 'active'",
            $pondokId
        );
        $musyrif = $count(
            "SELECT COUNT(*) FROM pondok_memberships
             WHERE pondok_id = :pondok_id AND role = 'musyrif' AND status = 'active'",
            $pondokId
        );
        $pending = $count(
            "SELECT COUNT(*) FROM submissions
             WHERE pondok_id = :pondok_id AND status = 'pending' AND deleted_at IS NULL",
            $pondokId
        );

        $reviewStatement = $pdo->prepare(
            "SELECT r.decision, COUNT(*) AS c
             FROM submission_reviews r
             JOIN submissions s ON s.id = r.submission_id
             WHERE s.pondok_id = :pondok_id AND s.deleted_at IS NULL
             GROUP BY r.decision"
        );
        $reviewStatement->execute(['pondok_id' => $pondokId]);
        $perDecision = [];
        foreach ($reviewStatement->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $perDecision[(string) $row['decision']] = (int) $row['c'];
        }
        $reviewTotal = array_sum($perDecision);

        $distribution = [];
        foreach (self::DECISION_LABELS as $code => $label) {
            $decisionCount = $perDecision[$code] ?? 0;
            $distribution[] = [
                'label' => $label,
                'count' => $decisionCount,
                'percent' => $reviewTotal > 0 ? (int) round($decisionCount * 100 / $reviewTotal) : 0,
            ];
        }

        $activityStatement = $pdo->prepare(
            "SELECT u.name, s.surah, s.juz, s.status, r.decision,
                    COALESCE(r.reviewed_at, s.submitted_at) AS t
             FROM submissions s
             JOIN users u ON u.id = s.user_id
             LEFT JOIN submission_reviews r ON r.submission_id = s.id
             WHERE s.pondok_id = :pondok_id AND s.deleted_at IS NULL
             ORDER BY t DESC
             LIMIT 6"
        );
        $activityStatement->execute(['pondok_id' => $pondokId]);
        $lastActivity = array_map(static function (array $row): array {
            $what = 'menyetor ' . ($row['surah'] !== null && $row['surah'] !== ''
                ? (string) $row['surah']
                : 'Juz ' . ($row['juz'] ?? '-'));
            $decision = $row['decision'] !== null ? (string) $row['decision'] : null;
            if ($decision !== null && isset(self::DECISION_LABELS[$decision])) {
                $what .= ' · ' . self::DECISION_LABELS[$decision];
            } elseif ((string) $row['status'] === 'pending') {
                $what .= ' · menunggu review';
            }
            return [
                'who' => (string) $row['name'],
                'what' => $what,
                'time' => (string) $row['t'],
            ];
        }, $activityStatement->fetchAll(PDO::FETCH_ASSOC));

        $summary = [
            'halaqah' => $halaqah,
            'santri' => $santri,
            'musyrif' => $musyrif,
            'mutqin_total' => $perDecision['mutqin'] ?? 0,
            'pending_total' => $pending,
            'distribution' => $distribution,
            'last_activity' => $lastActivity,
            'refreshed_at' => date('Y-m-d H:i:s'),
        ];

        self::persist($pdo, $pondokId, $summary);
        return $summary;
    }

    /** Baca ringkasan; hitung ulang bila hilang atau basi (> TTL). */
    public static function summary(PDO $pdo, int $pondokId, bool $force = false): array
    {
        if ($pondokId < 1) {
            return self::emptySummary();
        }

        if (!$force) {
            try {
                $statement = $pdo->prepare(
                    'SELECT halaqah_count, santri_count, musyrif_count, mutqin_total, pending_total,
                            distribution, last_activity, refreshed_at
                     FROM pondok_dashboard WHERE pondok_id = :pondok_id LIMIT 1'
                );
                $statement->execute(['pondok_id' => $pondokId]);
                $row = $statement->fetch(PDO::FETCH_ASSOC);
                if (is_array($row)) {
                    $age = time() - strtotime((string) $row['refreshed_at']);
                    if ($age >= 0 && $age < self::TTL_SECONDS) {
                        return self::rowToSummary($row);
                    }
                    // Basi → hitung ulang di bawah.
                }
            } catch (Throwable $exception) {
                error_log('MetodeQu dashboard baca gagal: ' . $exception->getMessage());
            }
        }

        return self::refresh($pdo, $pondokId);
    }

    /** Panggil dari layanan yang menulis data relevan (gagal tulis tidak boleh merusak operasi utama). */
    public static function refreshQuietly(PDO $pdo, int $pondokId): void
    {
        try {
            self::refresh($pdo, $pondokId);
        } catch (Throwable $exception) {
            error_log('MetodeQu dashboard refresh gagal: ' . $exception->getMessage());
        }
    }

    /** @param array{halaqah:int,santri:int,musyrif:int,mutqin_total:int,pending_total:int,distribution:array,last_activity:array,refreshed_at:string} $summary */
    private static function persist(PDO $pdo, int $pondokId, array $summary): void
    {
        try {
            $distribution = json_encode($summary['distribution'], JSON_UNESCAPED_UNICODE);
            $activity = json_encode($summary['last_activity'], JSON_UNESCAPED_UNICODE);
            if ($distribution === false) {
                $distribution = '[]';
            }
            if ($activity === false) {
                $activity = '[]';
            }

            $statement = $pdo->prepare(
                'INSERT INTO pondok_dashboard
                    (pondok_id, halaqah_count, santri_count, musyrif_count, mutqin_total, pending_total,
                     distribution, last_activity, refreshed_at)
                 VALUES
                    (:pondok_id, :halaqah, :santri, :musyrif, :mutqin, :pending,
                     :distribution, :activity, CURRENT_TIMESTAMP(3))
                 ON DUPLICATE KEY UPDATE
                    halaqah_count = VALUES(halaqah_count),
                    santri_count = VALUES(santri_count),
                    musyrif_count = VALUES(musyrif_count),
                    mutqin_total = VALUES(mutqin_total),
                    pending_total = VALUES(pending_total),
                    distribution = VALUES(distribution),
                    last_activity = VALUES(last_activity),
                    refreshed_at = CURRENT_TIMESTAMP(3),
                    updated_at = CURRENT_TIMESTAMP(3)'
            );
            $statement->execute([
                'pondok_id' => $pondokId,
                'halaqah' => $summary['halaqah'],
                'santri' => $summary['santri'],
                'musyrif' => $summary['musyrif'],
                'mutqin' => $summary['mutqin_total'],
                'pending' => $summary['pending_total'],
                'distribution' => $distribution,
                'activity' => $activity,
            ]);
        } catch (Throwable $exception) {
            error_log('MetodeQu dashboard persist gagal: ' . $exception->getMessage());
        }
    }

    /** @return array<string,mixed> */
    private static function rowToSummary(array $row): array
    {
        $decode = static function (?string $json): array {
            if ($json === null || $json === '') {
                return [];
            }
            $decoded = json_decode($json, true);
            return is_array($decoded) ? $decoded : [];
        };

        return [
            'halaqah' => (int) $row['halaqah_count'],
            'santri' => (int) $row['santri_count'],
            'musyrif' => (int) $row['musyrif_count'],
            'mutqin_total' => (int) $row['mutqin_total'],
            'pending_total' => (int) $row['pending_total'],
            'distribution' => $decode($row['distribution'] !== null ? (string) $row['distribution'] : null),
            'last_activity' => $decode($row['last_activity'] !== null ? (string) $row['last_activity'] : null),
            'refreshed_at' => (string) $row['refreshed_at'],
        ];
    }

    /** @return array<string,mixed> */
    private static function emptySummary(): array
    {
        return [
            'halaqah' => 0,
            'santri' => 0,
            'musyrif' => 0,
            'mutqin_total' => 0,
            'pending_total' => 0,
            'distribution' => [],
            'last_activity' => [],
            'refreshed_at' => date('Y-m-d H:i:s'),
        ];
    }
}
