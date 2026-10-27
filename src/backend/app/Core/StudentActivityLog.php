<?php

declare(strict_types=1);

namespace App\Core;

use App\Modules\Auth\RegistrationException;
use PDO;

final class StudentActivityLog
{
    private const DAYS = ['sabtu', 'ahad', 'senin', 'selasa', 'rabu', 'kamis'];

    public function __construct(private readonly PDO $pdo)
    {
        $this->ensureTable();
    }

    public function ensureTable(): void
    {
        $this->pdo->exec(
            "CREATE TABLE IF NOT EXISTS student_learning_activities (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                event_key VARCHAR(190) NOT NULL,
                user_id BIGINT UNSIGNED NOT NULL,
                halaqah_id BIGINT UNSIGNED NOT NULL,
                week_no TINYINT UNSIGNED NOT NULL,
                day_code ENUM('sabtu','ahad','senin','selasa','rabu','kamis') NOT NULL,
                step_id VARCHAR(50) NOT NULL,
                activity_key VARCHAR(50) NOT NULL,
                activity_count SMALLINT UNSIGNED NULL,
                occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                PRIMARY KEY (id),
                UNIQUE KEY uq_student_learning_activity_event (event_key),
                KEY idx_student_learning_activity_halaqah (halaqah_id, occurred_at),
                KEY idx_student_learning_activity_user (user_id, occurred_at),
                CONSTRAINT fk_student_learning_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_student_learning_activity_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    }

    /** @return array{id:int,event_key:string,step_id:string,activity_key:string,activity_count:?int,occurred_at:string} */
    public function log(int $userId, array $input): array
    {
        $week = (int) ($input['week'] ?? 0);
        $day = (string) ($input['day'] ?? '');
        $step = trim((string) ($input['step'] ?? ''));

        if ($week < 1 || $week > 5) {
            throw new RegistrationException('Pekan tidak valid.', 422, ['week' => 'Pekan tidak valid.']);
        }
        if (!in_array($day, self::DAYS, true)) {
            throw new RegistrationException('Hari tidak valid.', 422, ['day' => 'Hari tidak valid.']);
        }

        [$activityKey, $count] = $this->normalizeStep($step);
        $halaqahId = $this->activeHalaqahId($userId);
        if ($halaqahId < 1) {
            throw new RegistrationException('Santri belum tergabung dalam halaqah aktif.', 422);
        }

        $eventKey = implode(':', [$userId, $halaqahId, $week, $day, $step]);
        $insert = $this->pdo->prepare(
            'INSERT IGNORE INTO student_learning_activities
                (event_key, user_id, halaqah_id, week_no, day_code, step_id, activity_key, activity_count)
             VALUES
                (:event_key, :user_id, :halaqah_id, :week_no, :day_code, :step_id, :activity_key, :activity_count)'
        );
        $insert->execute([
            'event_key' => $eventKey,
            'user_id' => $userId,
            'halaqah_id' => $halaqahId,
            'week_no' => $week,
            'day_code' => $day,
            'step_id' => $step,
            'activity_key' => $activityKey,
            'activity_count' => $count,
        ]);

        $select = $this->pdo->prepare(
            'SELECT id, event_key, step_id, activity_key, activity_count, occurred_at
             FROM student_learning_activities
             WHERE event_key = :event_key
             LIMIT 1'
        );
        $select->execute(['event_key' => $eventKey]);
        $row = $select->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            throw new RegistrationException('Aktivitas gagal disimpan.', 500);
        }

        return [
            'id' => (int) $row['id'],
            'event_key' => (string) $row['event_key'],
            'step_id' => (string) $row['step_id'],
            'activity_key' => (string) $row['activity_key'],
            'activity_count' => $row['activity_count'] !== null ? (int) $row['activity_count'] : null,
            'occurred_at' => (string) $row['occurred_at'],
        ];
    }

    /** @return array{0:string,1:?int} */
    private function normalizeStep(string $step): array
    {
        if (preg_match('/^kemarin-([1-5])$/', $step, $match) === 1) {
            return ['hafalan_kemarin', (int) $match[1]];
        }
        if (preg_match('/^istima-([1-3])$/', $step, $match) === 1) {
            return ['istima', (int) $match[1]];
        }
        if (preg_match('/^tikrar-([1-9]|1[0-9]|2[0-5])$/', $step, $match) === 1) {
            return ['tikrar', (int) $match[1]];
        }
        if ($step === 'menghafal') {
            return ['menghafal', null];
        }
        if ($step === 'merekam') {
            return ['merekam', null];
        }

        throw new RegistrationException('Aktivitas tidak dikenal.', 422, ['step' => 'Aktivitas tidak dikenal.']);
    }

    private function activeHalaqahId(int $userId): int
    {
        $statement = $this->pdo->prepare(
            "SELECT hm.halaqah_id
             FROM halaqah_memberships hm
             JOIN halaqahs h ON h.id = hm.halaqah_id
             WHERE hm.user_id = :user_id
               AND hm.status = 'active'
               AND h.status = 'active'
               AND h.deleted_at IS NULL
             ORDER BY hm.joined_at DESC, hm.id DESC
             LIMIT 1"
        );
        $statement->execute(['user_id' => $userId]);
        $id = $statement->fetchColumn();

        return $id === false ? 0 : (int) $id;
    }
}
