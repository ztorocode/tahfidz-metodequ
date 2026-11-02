<?php

declare(strict_types=1);

namespace App\Modules\Users;

use App\Modules\Auth\RegistrationException;
use PDO;
use Throwable;

final class StudentHalaqahCatalogService
{
    public function __construct(private readonly PDO $pdo)
    {
        $this->ensureTable();
    }

    private function ensureTable(): void
    {
        // Tetap dapat berjalan di deploy auto-pull yang belum menjalankan migration.
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS student_halaqah_applications (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            halaqah_id BIGINT UNSIGNED NOT NULL,
            status ENUM('pending','approved','rejected','withdrawn') NOT NULL DEFAULT 'pending',
            requested_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            reviewed_by BIGINT UNSIGNED NULL,
            reviewed_at DATETIME(3) NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uq_student_halaqah_application (user_id,halaqah_id),
            KEY idx_student_halaqah_pending (halaqah_id,status),
            CONSTRAINT fk_student_halaqah_app_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_student_halaqah_app_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id) ON DELETE CASCADE,
            CONSTRAINT fk_student_halaqah_app_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    }

    /** @return array<string,mixed>|null */
    public function latestApplication(int $userId): ?array
    {
        $stmt = $this->pdo->prepare(
            "SELECT a.id,a.halaqah_id,a.status,h.name AS halaqah_name,
                    a.requested_at,a.reviewed_at
             FROM student_halaqah_applications a
             JOIN halaqahs h ON h.id=a.halaqah_id
             WHERE a.user_id=:user_id
             ORDER BY a.requested_at DESC,a.id DESC LIMIT 1"
        );
        $stmt->execute(['user_id'=>$userId]);
        $row=$stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /** @return array<int,array<string,mixed>> */
    public function catalog(int $userId): array
    {
        $stmt=$this->pdo->prepare(
            "SELECT h.id,h.name,h.program_start_date,h.pondok_id,p.name AS pondok_name,
                    mentor.name AS musyrif_name,
                    COUNT(DISTINCT CASE WHEN hm.status='active' AND student.status='active'
                        AND student.deleted_at IS NULL THEN hm.user_id END) AS members_count,
                    a.status AS application_status
             FROM halaqahs h
             JOIN musyrif_profiles mp ON mp.id=h.musyrif_profile_id AND mp.status='active'
             JOIN users mentor ON mentor.id=mp.user_id
                AND mentor.status='active' AND mentor.deleted_at IS NULL
             LEFT JOIN pondoks p ON p.id=h.pondok_id
             LEFT JOIN halaqah_memberships hm ON hm.halaqah_id=h.id
             LEFT JOIN users student ON student.id=hm.user_id
             LEFT JOIN student_halaqah_applications a ON a.halaqah_id=h.id AND a.user_id=:user_id
             WHERE h.status='active' AND h.deleted_at IS NULL
               AND (h.pondok_id IS NULL OR (p.status='active' AND p.deleted_at IS NULL))
             GROUP BY h.id,h.name,h.program_start_date,h.pondok_id,p.name,mentor.name,a.status
             ORDER BY h.pondok_id IS NULL,h.name"
        );
        $stmt->execute(['user_id'=>$userId]);
        return array_map(static fn(array $r):array=>[
            'id'=>(int)$r['id'],'name'=>(string)$r['name'],
            'scope'=>$r['pondok_id']===null?'platform':'pondok',
            'pondok_name'=>$r['pondok_name']!==null?(string)$r['pondok_name']:null,
            'musyrif_name'=>(string)$r['musyrif_name'],
            'members_count'=>(int)$r['members_count'],
            'program_start_date'=>$r['program_start_date']!==null?(string)$r['program_start_date']:null,
            'application_status'=>$r['application_status'],
        ],$stmt->fetchAll(PDO::FETCH_ASSOC));
    }


    /**
     * Cari maksimal lima halaqah aktif berdasarkan nama halaqah, nama ustadz,
     * atau kode 6 digit (ID database dengan zero-padding).
     * Tidak mengambil semua halaqah ke browser.
     *
     * @return array{items:array<int,array<string,mixed>>,pending_halaqah_id:?int}
     */
    public function search(int $userId, string $query): array
    {
        $query = trim($query);
        $exactCode = preg_match('/^[0-9]{6}$/D', $query) === 1
            ? (int) $query : 0;
        if (mb_strlen($query) > 100 || ($exactCode === 0 && mb_strlen($query) < 2)) {
            return ['items' => [], 'pending_halaqah_id' => null];
        }

        $pending = $this->pdo->prepare(
            "SELECT halaqah_id FROM student_halaqah_applications
             WHERE user_id = :user_id AND status = 'pending'
             ORDER BY requested_at DESC LIMIT 1"
        );
        $pending->execute(['user_id' => $userId]);
        $pendingId = $pending->fetchColumn();

        // LIKE escape '!' supaya % dan _ dari input diperlakukan literal.
        $escaped = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $query);
        $contains = '%' . $escaped . '%';
        $prefix = $escaped . '%';

        $stmt = $this->pdo->prepare(
            "SELECT h.id, h.name, h.program_start_date, h.pondok_id,
                    p.name AS pondok_name, mentor.name AS musyrif_name,
                    (SELECT COUNT(DISTINCT hm.user_id)
                     FROM halaqah_memberships hm
                     JOIN users student ON student.id = hm.user_id
                       AND student.status = 'active' AND student.deleted_at IS NULL
                     WHERE hm.halaqah_id = h.id AND hm.status = 'active') AS members_count,
                    (SELECT a.status FROM student_halaqah_applications a
                     WHERE a.halaqah_id = h.id AND a.user_id = :user_id
                     LIMIT 1) AS application_status
             FROM halaqahs h
             JOIN musyrif_profiles mp ON mp.id = h.musyrif_profile_id AND mp.status = 'active'
             JOIN users mentor ON mentor.id = mp.user_id
                AND mentor.status = 'active' AND mentor.deleted_at IS NULL
             LEFT JOIN pondoks p ON p.id = h.pondok_id
             WHERE h.status = 'active' AND h.deleted_at IS NULL
               AND (h.pondok_id IS NULL OR (p.status = 'active' AND p.deleted_at IS NULL))
               AND (h.name LIKE :halaqah_name ESCAPE '!'
                 OR mentor.name LIKE :mentor_name ESCAPE '!'
                 OR (h.id = :exact_id AND :code_enabled = 1))
             ORDER BY CASE
                 WHEN h.id = :sort_exact AND :sort_enabled = 1 THEN 0
                 WHEN h.name LIKE :prefix_name ESCAPE '!' THEN 1
                 WHEN mentor.name LIKE :prefix_mentor ESCAPE '!' THEN 2
                 ELSE 3 END, h.name, h.id
             LIMIT 5"
        );
        $stmt->execute([
            'user_id' => $userId,
            'halaqah_name' => $contains,
            'mentor_name' => $contains,
            'exact_id' => $exactCode,
            'code_enabled' => $exactCode > 0 ? 1 : 0,
            'sort_exact' => $exactCode,
            'sort_enabled' => $exactCode > 0 ? 1 : 0,
            'prefix_name' => $prefix,
            'prefix_mentor' => $prefix,
        ]);

        $items = array_map(static fn(array $row): array => [
            'id' => (int) $row['id'],
            'code' => str_pad((string) $row['id'], 6, '0', STR_PAD_LEFT),
            'name' => (string) $row['name'],
            'scope' => $row['pondok_id'] === null ? 'platform' : 'pondok',
            'pondok_name' => $row['pondok_name'] !== null ? (string) $row['pondok_name'] : null,
            'musyrif_name' => (string) $row['musyrif_name'],
            'members_count' => (int) $row['members_count'],
            'program_start_date' => $row['program_start_date'] !== null
                ? (string) $row['program_start_date'] : null,
            'application_status' => $row['application_status'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'items' => $items,
            'pending_halaqah_id' => $pendingId !== false ? (int) $pendingId : null,
        ];
    }

    /** @return array<string,mixed> */
    public function apply(int $userId, int $halaqahId): array
    {
        if($halaqahId<1)throw new RegistrationException('Pilih halaqah.',422);
        $own=!$this->pdo->inTransaction();
        if($own)$this->pdo->beginTransaction();
        try{
            // Serialisasi permohonan per santri untuk menghindari pendaftaran paralel.
            $lock=$this->pdo->prepare("SELECT id FROM users WHERE id=? AND status='active' FOR UPDATE");
            $lock->execute([$userId]);
            if($lock->fetchColumn()===false)throw new RegistrationException('Akun tidak aktif.',403);

            $active=$this->pdo->prepare(
                "SELECT 1 FROM halaqah_memberships hm
                 JOIN halaqahs h ON h.id=hm.halaqah_id AND h.status='active' AND h.deleted_at IS NULL
                 WHERE hm.user_id=? AND hm.status='active' LIMIT 1"
            );
            $active->execute([$userId]);
            if($active->fetchColumn()!==false)throw new RegistrationException(
                'Anda sudah terdaftar pada halaqah. Hubungi Ustadz untuk pindah halaqah.',409);

            $target=$this->pdo->prepare(
                "SELECT h.id,h.name FROM halaqahs h
                 JOIN musyrif_profiles mp ON mp.id=h.musyrif_profile_id AND mp.status='active'
                 JOIN users mentor ON mentor.id=mp.user_id AND mentor.status='active' AND mentor.deleted_at IS NULL
                 LEFT JOIN pondoks p ON p.id=h.pondok_id
                 WHERE h.id=? AND h.status='active' AND h.deleted_at IS NULL
                   AND (h.pondok_id IS NULL OR (p.status='active' AND p.deleted_at IS NULL))
                 LIMIT 1"
            );
            $target->execute([$halaqahId]);
            $h=$target->fetch(PDO::FETCH_ASSOC);
            if(!$h)throw new RegistrationException('Halaqah tidak tersedia untuk pendaftaran.',404);

            $pending=$this->pdo->prepare(
                "SELECT id FROM student_halaqah_applications WHERE user_id=? AND status='pending' LIMIT 1"
            );
            $pending->execute([$userId]);
            if($pending->fetchColumn()!==false)throw new RegistrationException(
                'Anda masih memiliki pendaftaran yang menunggu persetujuan.',409);

            $existing=$this->pdo->prepare(
                "SELECT id FROM student_halaqah_applications WHERE user_id=? AND halaqah_id=? LIMIT 1"
            );
            $existing->execute([$userId,$halaqahId]);
            $existingId=$existing->fetchColumn();
            if($existingId!==false){
                $this->pdo->prepare(
                    "UPDATE student_halaqah_applications
                     SET status='pending',requested_at=CURRENT_TIMESTAMP(3),
                         reviewed_by=NULL,reviewed_at=NULL WHERE id=?"
                )->execute([(int)$existingId]);
                $id=(int)$existingId;
            }else{
                $this->pdo->prepare(
                    "INSERT INTO student_halaqah_applications (user_id,halaqah_id)
                     VALUES (?,?)"
                )->execute([$userId,$halaqahId]);
                $id=(int)$this->pdo->lastInsertId();
            }
            if($own)$this->pdo->commit();
            return ['id'=>$id,'halaqah_id'=>$halaqahId,'halaqah_name'=>$h['name'],'status'=>'pending'];
        }catch(Throwable $e){
            if($own&&$this->pdo->inTransaction())$this->pdo->rollBack();
            throw $e;
        }
    }

    /** @param array{id:int,roles:array<int,string>} $actor */
    public function applications(array $actor): array
    {
        $id=(int)$actor['id'];
        $roleCheck="(mp.user_id = :mentor_id AND mp.status='active'
                     OR EXISTS (SELECT 1 FROM pondok_memberships pm
                        WHERE pm.pondok_id=h.pondok_id AND pm.user_id=:admin_id
                          AND pm.role='admin' AND pm.status='active'))";
        $stmt=$this->pdo->prepare(
            "SELECT a.id,a.user_id,a.halaqah_id,a.requested_at,
                    h.name AS halaqah_name,u.name AS student_name,u.email AS student_email
             FROM student_halaqah_applications a
             JOIN halaqahs h ON h.id=a.halaqah_id AND h.deleted_at IS NULL AND h.status='active'
             JOIN musyrif_profiles mp ON mp.id=h.musyrif_profile_id
             JOIN users u ON u.id=a.user_id
             WHERE a.status='pending' AND ".$roleCheck."
             ORDER BY a.requested_at ASC,a.id ASC LIMIT 100"
        );
        $stmt->execute(['mentor_id'=>$id,'admin_id'=>$id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /** @param array{id:int,roles:array<int,string>} $actor */
    public function review(array $actor,int $applicationId,string $decision): array
    {
        if(!in_array($decision,['approved','rejected'],true))throw new RegistrationException('Keputusan tidak valid.',422);
        if($applicationId<1)throw new RegistrationException('Pendaftaran tidak valid.',422);
        $own=!$this->pdo->inTransaction();
        if($own)$this->pdo->beginTransaction();
        try{
            $stmt=$this->pdo->prepare(
                "SELECT a.id,a.user_id,a.halaqah_id,a.status,h.name,h.pondok_id,
                        h.musyrif_profile_id,mp.user_id AS mentor_id,mp.status AS mentor_status,
                        mentor.status AS mentor_account_status
                 FROM student_halaqah_applications a
                 JOIN halaqahs h ON h.id=a.halaqah_id AND h.deleted_at IS NULL AND h.status='active'
                 JOIN musyrif_profiles mp ON mp.id=h.musyrif_profile_id
                 JOIN users mentor ON mentor.id=mp.user_id AND mentor.deleted_at IS NULL
                 WHERE a.id=? FOR UPDATE"
            );
            $stmt->execute([$applicationId]);
            $row=$stmt->fetch(PDO::FETCH_ASSOC);
            if(!$row)throw new RegistrationException('Pendaftaran tidak ditemukan.',404);
            if($row['status']!=='pending')throw new RegistrationException('Pendaftaran sudah diproses.',409);

            $id=(int)$actor['id'];
            $isMentor=(int)$row['mentor_id']===$id
                &&$row['mentor_status']==='active'
                &&in_array('musyrif',$actor['roles']??[],true);
            $isAdmin=false;
            if($row['pondok_id']!==null&&in_array('admin',$actor['roles']??[],true)){
                $check=$this->pdo->prepare(
                    "SELECT 1 FROM pondok_memberships
                     WHERE pondok_id=? AND user_id=? AND role='admin' AND status='active' LIMIT 1"
                );
                $check->execute([(int)$row['pondok_id'],$id]);
                $isAdmin=$check->fetchColumn()!==false;
            }
            if(!$isMentor&&!$isAdmin)throw new RegistrationException('Anda tidak berwenang memproses pendaftaran ini.',403);

            if($decision==='approved'){
                if($row['mentor_status']!=='active'||$row['mentor_account_status']!=='active'){
                    throw new RegistrationException('Ustadz pembimbing tidak aktif.',409);
                }
                $member=(int)$row['user_id'];
                $active=$this->pdo->prepare(
                    "SELECT hm.halaqah_id FROM halaqah_memberships hm
                     JOIN halaqahs h ON h.id=hm.halaqah_id AND h.deleted_at IS NULL AND h.status='active'
                     WHERE hm.user_id=? AND hm.status='active' LIMIT 1"
                );
                $active->execute([$member]);
                if($active->fetchColumn()!==false)throw new RegistrationException('Santri sudah bergabung di halaqah lain.',409);

                // Pondok memerlukan status anggota aktif agar progresnya bisa disinkronkan.
                if($row['pondok_id']!==null){
                    $p=(int)$row['pondok_id'];
                    $membership=$this->pdo->prepare("SELECT id,role FROM pondok_memberships WHERE pondok_id=? AND user_id=? LIMIT 1");
                    $membership->execute([$p,$member]);
                    $m=$membership->fetch(PDO::FETCH_ASSOC);
                    if($m){
                        if($m['role']!=='santri')throw new RegistrationException('Akun sudah memiliki peran lain di pondok.',409);
                        $this->pdo->prepare(
                            "UPDATE pondok_memberships SET status='active',joined_at=CURRENT_TIMESTAMP(3),ended_at=NULL WHERE id=?"
                        )->execute([(int)$m['id']]);
                    }else{
                        $this->pdo->prepare(
                            "INSERT INTO pondok_memberships(pondok_id,user_id,role,status,joined_at)
                             VALUES (?,?,'santri','active',CURRENT_TIMESTAMP(3))"
                        )->execute([$p,$member]);
                    }
                }

                $this->pdo->prepare(
                    "INSERT INTO musyrif_mentees(musyrif_profile_id,user_id,status,assigned_at,ended_at)
                     VALUES (?,?,'active',CURRENT_TIMESTAMP(3),NULL)
                     ON DUPLICATE KEY UPDATE status='active',assigned_at=CURRENT_TIMESTAMP(3),ended_at=NULL"
                )->execute([(int)$row['musyrif_profile_id'],$member]);

                $ex=$this->pdo->prepare(
                    "SELECT id FROM halaqah_memberships WHERE halaqah_id=? AND user_id=? LIMIT 1"
                );
                $ex->execute([(int)$row['halaqah_id'],$member]);
                $old=$ex->fetchColumn();
                if($old===false){
                    $this->pdo->prepare(
                        "INSERT INTO halaqah_memberships(halaqah_id,user_id,status)
                         VALUES (?,?,'active')"
                    )->execute([(int)$row['halaqah_id'],$member]);
                }else{
                    $this->pdo->prepare(
                        "UPDATE halaqah_memberships SET status='active',joined_at=CURRENT_TIMESTAMP(3),ended_at=NULL WHERE id=?"
                    )->execute([(int)$old]);
                }
            }

            $this->pdo->prepare(
                "UPDATE student_halaqah_applications
                 SET status=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP(3) WHERE id=?"
            )->execute([$decision,$id,$applicationId]);

            if($own)$this->pdo->commit();
            return ['id'=>$applicationId,'status'=>$decision,'halaqah_name'=>$row['name']];
        }catch(Throwable $e){
            if($own&&$this->pdo->inTransaction())$this->pdo->rollBack();
            throw $e;
        }
    }
}
