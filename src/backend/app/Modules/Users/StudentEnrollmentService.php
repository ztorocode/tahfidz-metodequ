<?php

declare(strict_types=1);

namespace App\Modules\Users;

use PDO;

final class StudentEnrollmentService
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @return array<string,mixed> */
    public function forStudent(int $userId, string $email): array
    {
        // Hanya relasi halaqah yang aktif; pondok_memberships saja bukan bukti
        // santri sudah mengikuti sebuah program dengan Ustadz pembimbing.
        $statement = $this->pdo->prepare(
            "SELECT h.id, h.name, h.pondok_id, h.start_date_mode,
                    CASE WHEN h.start_date_mode = 'individual' THEN hm.program_start_date
                         ELSE h.program_start_date END AS program_start_date,
                    p.name AS pondok_name, mu.id AS musyrif_user_id,
                    mu.name AS musyrif_name
             FROM halaqah_memberships hm
             JOIN halaqahs h ON h.id = hm.halaqah_id
                  AND h.status = 'active' AND h.deleted_at IS NULL
             LEFT JOIN pondoks p ON p.id = h.pondok_id
             LEFT JOIN musyrif_profiles mp ON mp.id = h.musyrif_profile_id
                  AND mp.status = 'active'
             LEFT JOIN users mu ON mu.id = mp.user_id
                  AND mu.status = 'active' AND mu.deleted_at IS NULL
             WHERE hm.user_id = :user_id AND hm.status = 'active'
               AND (h.pondok_id IS NULL OR (p.status = 'active' AND p.deleted_at IS NULL))
             ORDER BY (h.pondok_id IS NULL) ASC, hm.joined_at DESC, hm.id DESC
             LIMIT 1"
        );
        $statement->execute(['user_id' => $userId]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        if (is_array($row)) {
            $date = $row['program_start_date'] !== null ? (string) $row['program_start_date'] : null;
            $scope = $row['pondok_id'] === null ? 'platform' : 'pondok';
            $today = (new \DateTimeImmutable('now', new \DateTimeZone('Asia/Jakarta')))->format('Y-m-d');
            $mentor = $row['musyrif_user_id'] !== null;
            $individual = $row['start_date_mode'] === 'individual';
            $status = !$mentor ? 'mentor_pending'
                : ($scope === 'platform' ? 'platform_progress_unavailable'
                : ($individual && $date === null ? 'active'
                : ($date === null ? 'schedule_pending'
                : ($date > $today ? 'scheduled' : 'active'))));

            return [
                'status' => $status,
                'halaqah' => [
                    'id' => (int) $row['id'],
                    'name' => (string) $row['name'],
                    'pondok_id' => $row['pondok_id'] !== null ? (int) $row['pondok_id'] : null,
                    'pondok_name' => $row['pondok_name'] !== null ? (string) $row['pondok_name'] : null,
                    'scope' => $scope,
                    'musyrif_user_id' => $mentor ? (int) $row['musyrif_user_id'] : null,
                    'musyrif_name' => $mentor ? (string) $row['musyrif_name'] : null,
                    'program_start_date' => $date,
                    'start_date_mode' => (string) $row['start_date_mode'],
                ],
                'invites' => [],
            ];
        }

        $application = (new StudentHalaqahCatalogService($this->pdo))->latestApplication($userId);
        if ($application !== null && $application['status'] === 'pending') {
            return [
                'status' => 'application_pending',
                'halaqah' => null,
                'application' => [
                    'id' => (int) $application['id'],
                    'halaqah_id' => (int) $application['halaqah_id'],
                    'halaqah_name' => (string) $application['halaqah_name'],
                ],
                'invites' => [],
            ];
        }

        $invitations = [];

        $platform = $this->pdo->prepare(
            "SELECT psi.id, h.name AS halaqah_name, psi.invite_token_plain
             FROM platform_santri_invites psi
             JOIN halaqahs h ON h.id = psi.halaqah_id
                 AND h.status = 'active' AND h.deleted_at IS NULL
             WHERE psi.invited_email = :email AND psi.status = 'pending'
               AND psi.expires_at > CURRENT_TIMESTAMP(3)
             ORDER BY psi.created_at DESC LIMIT 10"
        );
        $platform->execute(['email' => $email]);
        foreach ($platform->fetchAll(PDO::FETCH_ASSOC) as $invite) {
            $invitations[] = [
                'type' => 'platform',
                'id' => (int) $invite['id'],
                'name' => (string) $invite['halaqah_name'],
                'link' => $invite['invite_token_plain'] !== null
                    ? '#terima-undangan?t=platform-santri&token=' . rawurlencode((string) $invite['invite_token_plain'])
                    : null,
            ];
        }

        $pondok = $this->pdo->prepare(
            "SELECT pi.id, p.name AS pondok_name, h.name AS halaqah_name
             FROM pondok_invites pi
             JOIN pondoks p ON p.id = pi.pondok_id AND p.status = 'active' AND p.deleted_at IS NULL
             LEFT JOIN halaqahs h ON h.id = pi.halaqah_id AND h.deleted_at IS NULL
             WHERE pi.invited_email = :email AND pi.role = 'santri'
               AND pi.status = 'pending' AND pi.expires_at > CURRENT_TIMESTAMP(3)
             ORDER BY pi.created_at DESC LIMIT 10"
        );
        $pondok->execute(['email' => $email]);
        foreach ($pondok->fetchAll(PDO::FETCH_ASSOC) as $invite) {
            $invitations[] = [
                'type' => 'pondok',
                'id' => (int) $invite['id'],
                'name' => (string) ($invite['halaqah_name'] ?: $invite['pondok_name']),
                'link' => '#notifications',
            ];
        }

        return [
            'status' => $invitations !== [] ? 'invited' : 'not_enrolled',
            'halaqah' => null,
            'invites' => $invitations,
        ];
    }
}
