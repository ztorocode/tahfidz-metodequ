<?php

declare(strict_types=1);

namespace App\Core;

use App\Modules\Auth\RegistrationException;
use PDO;

/**
 * One-time start date for an active halaqah membership.
 * Caller must own a transaction, so recording activity and setting the date
 * either both succeed or both roll back.
 */
final class IndividualProgramStart
{
    /** @return array{program_start_date:?string,program_started:bool} */
    public static function claim(PDO $pdo, int $userId, int $halaqahId, int $week, string $day, ?\DateTimeImmutable $now = null): array
    {
        $rowStmt = $pdo->prepare(
            "SELECT hm.id, hm.program_start_date, h.start_date_mode
             FROM halaqah_memberships hm
             JOIN halaqahs h ON h.id = hm.halaqah_id
             WHERE hm.user_id = ? AND hm.halaqah_id = ?
               AND hm.status = 'active' AND h.status = 'active'
               AND h.deleted_at IS NULL
             LIMIT 1 FOR UPDATE"
        );
        $rowStmt->execute([$userId, $halaqahId]);
        $row = $rowStmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new RegistrationException('Santri bukan anggota halaqah aktif.', 403);
        }
        if ($row['start_date_mode'] !== 'individual') {
            return ['program_start_date' => null, 'program_started' => false];
        }
        if ($row['program_start_date'] !== null) {
            return ['program_start_date' => (string) $row['program_start_date'], 'program_started' => false];
        }
        if ($week !== 1 || $day !== 'sabtu') {
            throw new RegistrationException('Mulai dari Hari ke-1 Pekan 1 untuk mencatat aktivitas pertama.', 422);
        }
        $today = ($now ?? new \DateTimeImmutable('now', new \DateTimeZone('Asia/Jakarta')))
            ->setTimezone(new \DateTimeZone('Asia/Jakarta'));
        if ($today->format('N') === '5') {
            throw new RegistrationException('Jum’at libur. Aktivitas pertama dapat dicatat mulai Sabtu.', 422);
        }
        $date = $today->format('Y-m-d');
        $update = $pdo->prepare(
            'UPDATE halaqah_memberships SET program_start_date = ?
             WHERE id = ? AND program_start_date IS NULL'
        );
        $update->execute([$date, (int) $row['id']]);
        return ['program_start_date' => $date, 'program_started' => true];
    }
}
