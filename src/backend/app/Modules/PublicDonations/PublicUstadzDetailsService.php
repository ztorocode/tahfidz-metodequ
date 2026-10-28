<?php

declare(strict_types=1);

namespace App\Modules\PublicDonations;

use App\Core\Response;
use DateTimeImmutable;
use DateTimeZone;
use PDO;

final class PublicUstadzDetailsService
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    private function tableExists(string $name): bool
    {
        $q = $this->pdo->prepare('SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = :name LIMIT 1');
        $q->execute(['name' => $name]);
        return $q->fetchColumn() !== false;
    }

    public function detail(int $id): ?array
    {
        $q = $this->pdo->prepare(
            "SELECT mp.id, mp.user_id, u.name, mp.type, p.name AS pondok_name
             FROM musyrif_profiles mp
             JOIN users u ON u.id = mp.user_id AND u.status = 'active' AND u.deleted_at IS NULL
             LEFT JOIN pondoks p ON p.id = mp.pondok_id AND p.status = 'active' AND p.deleted_at IS NULL
             WHERE mp.id = :id AND mp.status = 'active'
               AND (mp.type = 'platform' OR p.id IS NOT NULL)
             LIMIT 1"
        );
        $q->execute(['id' => $id]);
        $ustadz = $q->fetch(PDO::FETCH_ASSOC);
        if (!is_array($ustadz)) {
            return null;
        }

        $bank = null;
        if ($this->tableExists('ustadz_public_banks')) {
            $b = $this->pdo->prepare('SELECT bank_name, account_number, account_holder FROM ustadz_public_banks WHERE musyrif_profile_id = :id AND is_public = 1 LIMIT 1');
            $b->execute(['id' => $id]);
            $row = $b->fetch(PDO::FETCH_ASSOC);
            if (is_array($row)) {
                $bank = [
                    'bank_name' => (string) $row['bank_name'],
                    'account_number' => (string) $row['account_number'],
                    'account_holder' => (string) $row['account_holder'],
                ];
            }
        }

        $month = new DateTimeImmutable('first day of this month 00:00:00', new DateTimeZone('Asia/Jakarta'));
        $activityExists = $this->tableExists('student_activities');
        $progressExists = $this->tableExists('member_progress');
        $activityColumn = $activityExists
            ? "(SELECT COUNT(*) FROM student_activities a WHERE a.halaqah_id = h.id AND a.created_at >= :activity_start AND a.created_at < :activity_end)"
            : "0";
        $progressColumn = $progressExists
            ? "(SELECT ROUND(AVG(pr.completion_percent))
                  FROM member_progress pr
                  WHERE pr.halaqah_id = h.id AND pr.deleted_at IS NULL
                    AND pr.id = (SELECT MAX(pr2.id) FROM member_progress pr2
                                 WHERE pr2.user_id = pr.user_id AND pr2.halaqah_id = h.id AND pr2.deleted_at IS NULL))"
            : "NULL";

        $sql = "SELECT h.id, h.name,
                       (SELECT COUNT(DISTINCT hm.user_id)
                        FROM halaqah_memberships hm
                        JOIN users santri ON santri.id = hm.user_id AND santri.status = 'active' AND santri.deleted_at IS NULL
                        WHERE hm.halaqah_id = h.id AND hm.status = 'active') AS santri_aktif,
                       " . $activityColumn . " AS aktivitas_bulan_ini,
                       (SELECT COUNT(*) FROM setoran_reviews r WHERE r.halaqah_id = h.id AND r.deleted_at IS NULL)
                        + (SELECT COUNT(*) FROM submission_reviews r JOIN submissions s ON s.id = r.submission_id WHERE s.halaqah_id = h.id AND s.deleted_at IS NULL) AS setoran_dinilai,
                       (SELECT COUNT(*) FROM setoran_reviews r WHERE r.halaqah_id = h.id AND r.decision = 'mutqin' AND r.deleted_at IS NULL)
                        + (SELECT COUNT(*) FROM submission_reviews r JOIN submissions s ON s.id = r.submission_id WHERE s.halaqah_id = h.id AND s.deleted_at IS NULL AND r.decision = 'mutqin') AS hafalan_mutqin,
                       " . $progressColumn . " AS progres_rata_rata
                FROM halaqahs h
                WHERE h.musyrif_profile_id = :profile AND h.status = 'active' AND h.deleted_at IS NULL
                ORDER BY h.name ASC LIMIT 30";

        $h = $this->pdo->prepare($sql);
        $params = ['profile' => $id];
        if ($activityExists) {
            $params['activity_start'] = $month->format('Y-m-d H:i:s');
            $params['activity_end'] = $month->modify('+1 month')->format('Y-m-d H:i:s');
        }
        $h->execute($params);
        $halaqahs = array_map(static fn (array $v): array => [
            'id' => (int) $v['id'],
            'name' => (string) $v['name'],
            'santri_aktif' => (int) $v['santri_aktif'],
            'aktivitas_bulan_ini' => (int) $v['aktivitas_bulan_ini'],
            'setoran_dinilai' => (int) $v['setoran_dinilai'],
            'hafalan_mutqin' => (int) $v['hafalan_mutqin'],
            'progres_rata_rata' => $v['progres_rata_rata'] === null ? null : (int) $v['progres_rata_rata'],
        ], $h->fetchAll(PDO::FETCH_ASSOC));

        $photos = [];
        if ($this->tableExists('ustadz_activity_photos')) {
            $p = $this->pdo->prepare(
                'SELECT ph.id, ph.caption, ph.created_at, h.name AS halaqah_name
                 FROM ustadz_activity_photos ph
                 LEFT JOIN halaqahs h ON h.id = ph.halaqah_id
                 WHERE ph.musyrif_profile_id = :id AND ph.published = 1
                 ORDER BY ph.created_at DESC, ph.id DESC LIMIT 24'
            );
            $p->execute(['id' => $id]);
            $photos = array_map(static fn (array $v): array => [
                'id' => (int) $v['id'],
                'caption' => (string) $v['caption'],
                'halaqah_name' => $v['halaqah_name'] !== null ? (string) $v['halaqah_name'] : null,
                'created_at' => (string) $v['created_at'],
                'url' => '/api/public/ustadz/photo?id=' . (int) $v['id'],
            ], $p->fetchAll(PDO::FETCH_ASSOC));
        }
        return [
            'id' => (int) $ustadz['id'],
            'name' => (string) $ustadz['name'],
            'pondok_name' => $ustadz['pondok_name'] !== null ? (string) $ustadz['pondok_name'] : null,
            'bank' => $bank,
            'month' => $month->format('Y-m'),
            'halaqahs' => $halaqahs,
            'photos' => $photos,
        ];
    }


    /**
     * Keanggotaan aktual, ditampilkan sebagai label anonim tanpa data personal.
     */
    public function students(int $profileId, int $halaqahId): ?array
    {
        $q = $this->pdo->prepare(
            "SELECT h.id, h.name, ustadz.name AS ustadz_name
             FROM halaqahs h
             JOIN musyrif_profiles mp ON mp.id = h.musyrif_profile_id AND mp.status = 'active'
             JOIN users ustadz ON ustadz.id = mp.user_id AND ustadz.status = 'active' AND ustadz.deleted_at IS NULL
             LEFT JOIN pondoks p ON p.id = mp.pondok_id AND p.status = 'active' AND p.deleted_at IS NULL
             WHERE h.id = :halaqah_id AND h.musyrif_profile_id = :profile_id
               AND h.status = 'active' AND h.deleted_at IS NULL
               AND (mp.type = 'platform' OR p.id IS NOT NULL)
             LIMIT 1"
        );
        $q->execute(['halaqah_id' => $halaqahId, 'profile_id' => $profileId]);
        $halaqah = $q->fetch(PDO::FETCH_ASSOC);
        if (!is_array($halaqah)) {
            return null;
        }

        $members = $this->pdo->prepare(
            "SELECT DISTINCT hm.user_id
             FROM halaqah_memberships hm
             JOIN users santri ON santri.id = hm.user_id AND santri.status = 'active' AND santri.deleted_at IS NULL
             WHERE hm.halaqah_id = :halaqah_id AND hm.status = 'active'
             ORDER BY hm.user_id ASC"
        );
        $members->execute(['halaqah_id' => $halaqahId]);
        $studentIds = $members->fetchAll(PDO::FETCH_COLUMN);
        $students = [];
        foreach ($studentIds as $index => $_studentId) {
            $students[] = ['label' => 'Santri ' . ($index + 1)];
        }

        return [
            'halaqah_name' => (string) $halaqah['name'],
            'ustadz_name' => (string) $halaqah['ustadz_name'],
            'santri_aktif' => count($students),
            'students' => $students,
        ];
    }

    public function sendPhoto(int $id): never
    {
        if (!$this->tableExists('ustadz_activity_photos')) {
            Response::json(['success' => false, 'message' => 'Foto tidak ditemukan.'], 404);
        }
        $q = $this->pdo->prepare(
            "SELECT ph.filename FROM ustadz_activity_photos ph
             JOIN musyrif_profiles mp ON mp.id = ph.musyrif_profile_id AND mp.status = 'active'
             JOIN users u ON u.id = mp.user_id AND u.status = 'active' AND u.deleted_at IS NULL
             LEFT JOIN pondoks p ON p.id = mp.pondok_id AND p.status = 'active' AND p.deleted_at IS NULL
             WHERE ph.id = :id AND ph.published = 1 AND (mp.type = 'platform' OR p.id IS NOT NULL) LIMIT 1"
        );
        $q->execute(['id' => $id]);
        $fileName = $q->fetchColumn();
        if (!is_string($fileName) || !preg_match('/^[a-f0-9]{32}\.jpg$/', $fileName)) {
            Response::json(['success' => false, 'message' => 'Foto tidak ditemukan.'], 404);
        }
        $file = dirname(__DIR__, 3) . '/storage/ustadz-activities/' . $fileName;
        if (!is_file($file)) {
            Response::json(['success' => false, 'message' => 'Foto belum tersedia.'], 404);
        }
        header('Content-Type: image/jpeg');
        header('X-Content-Type-Options: nosniff');
        header('Content-Disposition: inline');
        header('Cache-Control: no-store');
        header('Content-Length: ' . filesize($file));
        readfile($file);
        exit;
    }
}
