<?php

declare(strict_types=1);

namespace App\Modules\PublicDonations;

use DateTimeImmutable;
use DateTimeZone;
use PDO;

/**
 * Public aggregates only; never include student identity or donor information.
 */
final class PublicUstadzService
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function list(): array
    {
        $start = new DateTimeImmutable('first day of this month 00:00:00', new DateTimeZone('Asia/Jakarta'));
        $end = $start->modify('+1 month');

        $sql = <<<'SQL'
SELECT mp.id,
       u.name,
       mp.type,
       p.name AS pondok_name,
       COALESCE(students.santri_aktif, 0) AS santri_aktif,
       COALESCE(reviews.setoran_dinilai, 0) AS setoran_dinilai,
       COALESCE(reviews.hafalan_mutqin, 0) AS hafalan_mutqin,
       COALESCE(donations.total_idr, 0) AS donasi_bulan_ini
FROM musyrif_profiles mp
JOIN users u ON u.id = mp.user_id AND u.status = 'active' AND u.deleted_at IS NULL
LEFT JOIN pondoks p ON p.id = mp.pondok_id AND p.status = 'active' AND p.deleted_at IS NULL
LEFT JOIN (
    SELECT active_members.musyrif_profile_id, COUNT(*) AS santri_aktif
    FROM (
        SELECT h.musyrif_profile_id, hm.user_id
        FROM halaqah_memberships hm
        JOIN halaqahs h ON h.id = hm.halaqah_id
        JOIN users student ON student.id = hm.user_id AND student.status = 'active' AND student.deleted_at IS NULL
        WHERE hm.status = 'active' AND h.status = 'active'
          AND h.deleted_at IS NULL AND h.musyrif_profile_id IS NOT NULL
        UNION
        SELECT mm.musyrif_profile_id, mm.user_id
        FROM musyrif_mentees mm
        JOIN users student ON student.id = mm.user_id AND student.status = 'active' AND student.deleted_at IS NULL
        WHERE mm.status = 'active'
    ) active_members
    GROUP BY active_members.musyrif_profile_id
) students ON students.musyrif_profile_id = mp.id
LEFT JOIN (
    SELECT entries.reviewer_id,
           COUNT(*) AS setoran_dinilai,
           SUM(CASE WHEN entries.decision = 'mutqin' THEN 1 ELSE 0 END) AS hafalan_mutqin
    FROM (
        SELECT created_by AS reviewer_id, decision
        FROM setoran_reviews
        WHERE deleted_at IS NULL
        UNION ALL
        SELECT reviewer_user_id AS reviewer_id, decision
        FROM submission_reviews
    ) entries
    GROUP BY entries.reviewer_id
) reviews ON reviews.reviewer_id = mp.user_id
LEFT JOIN (
    SELECT musyrif_profile_id, SUM(amount_idr) AS total_idr
    FROM donation_transfers
    WHERE status = 'verified' AND sent_at >= :month_start AND sent_at < :month_end
    GROUP BY musyrif_profile_id
) donations ON donations.musyrif_profile_id = mp.id
WHERE mp.status = 'active'
  AND (mp.type = 'platform' OR p.id IS NOT NULL)
ORDER BY COALESCE(students.santri_aktif, 0) DESC, u.name ASC
SQL;

        $query = $this->pdo->prepare($sql);
        $query->execute([
            'month_start' => $start->format('Y-m-d H:i:s'),
            'month_end' => $end->format('Y-m-d H:i:s'),
        ]);
        $items = array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'name' => (string) $row['name'],
            'type' => (string) $row['type'],
            'pondok_name' => $row['pondok_name'] !== null ? (string) $row['pondok_name'] : null,
            'santri_aktif' => (int) $row['santri_aktif'],
            'setoran_dinilai' => (int) $row['setoran_dinilai'],
            'hafalan_mutqin' => (int) $row['hafalan_mutqin'],
            'donasi_bulan_ini' => (int) $row['donasi_bulan_ini'],
        ], $query->fetchAll(PDO::FETCH_ASSOC));

        return [
            'month' => $start->format('Y-m'),
            'currency' => 'IDR',
            'items' => $items,
        ];
    }
}
