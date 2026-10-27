<?php

declare(strict_types=1);

namespace App\Modules\Setoran;

use App\Modules\Auth\RegistrationException;
use PDO;

/**
 * Penilaian setoran santri oleh musyrif halaqahnya.
 *
 * Menopang kartu Riwayat Setoran, Catatan Musyrif, Ringkasan Penguatan,
 * Progress Hafalan, dan Murajaah pada halaman #santri-progress.
 */
final class SetoranService
{
    private const DECISIONS = ['mutqin', 'cukup_stabil', 'penguatan', 'ulang'];

    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @return array{rows: array<int, array<string, mixed>>} */
    public function list(array $actor, int $pondokId, int $userId): array
    {
        if ($userId < 1) {
            throw new RegistrationException('Santri wajib dipilih.', 422, ['user_id' => 'Santri wajib dipilih.']);
        }
        if ($pondokId < 1) {
            throw new RegistrationException('Pondok tidak diketahui.', 422, ['pondok_id' => 'Pondok tidak diketahui.']);
        }

        $this->assertCanView($actor, $pondokId, $userId);

        $statement = $this->pdo->prepare(
            'SELECT r.id, r.ref, r.page_no, r.decision, r.notes, r.halaqah_id,
                    r.created_by, r.created_at, r.updated_at,
                    h.name AS halaqah_name, u.name AS created_by_name
             FROM setoran_reviews r
             JOIN users u ON u.id = r.created_by
             LEFT JOIN halaqahs h ON h.id = r.halaqah_id AND h.deleted_at IS NULL
             WHERE r.user_id = :user_id AND r.pondok_id = :pondok_id AND r.deleted_at IS NULL
             ORDER BY r.created_at DESC, r.id DESC
             LIMIT 200'
        );
        $statement->execute(['user_id' => $userId, 'pondok_id' => $pondokId]);

        $rows = [];
        foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $rows[] = [
                'id' => (int) $row['id'],
                'ref' => (string) $row['ref'],
                'page_no' => $row['page_no'] !== null ? (int) $row['page_no'] : null,
                'decision' => (string) $row['decision'],
                'notes' => $row['notes'] !== null && $row['notes'] !== '' ? (string) $row['notes'] : null,
                'halaqah_id' => $row['halaqah_id'] !== null ? (int) $row['halaqah_id'] : null,
                'halaqah_name' => $row['halaqah_name'] !== null ? (string) $row['halaqah_name'] : null,
                'created_by' => (int) $row['created_by'],
                'created_by_name' => (string) $row['created_by_name'],
                'created_at' => (string) $row['created_at'],
            ];
        }

        return ['rows' => $rows];
    }

    /** @param array{id:int, roles:string[]} $actor @return array<string, mixed> */
    public function create(array $actor, array $input): array
    {
        $pondokId = (int) ($input['pondok_id'] ?? 0);
        $userId = (int) ($input['user_id'] ?? 0);
        $ref = trim((string) ($input['ref'] ?? ''));
        $decision = (string) ($input['decision'] ?? '');
        $notes = trim((string) ($input['notes'] ?? ''));
        $rawPage = $input['page_no'] ?? null;
        $pageNo = ($rawPage === null || $rawPage === '') ? null : (int) $rawPage;

        $errors = [];
        if ($pondokId < 1) {
            $errors['pondok_id'] = 'Pondok tidak diketahui.';
        }
        if ($userId < 1) {
            $errors['user_id'] = 'Santri wajib dipilih.';
        }
        if ($ref === '') {
            $errors['ref'] = 'Nama setoran wajib diisi.';
        } elseif (mb_strlen($ref) > 190) {
            $errors['ref'] = 'Nama setoran maksimal 190 karakter.';
        }
        if (!in_array($decision, self::DECISIONS, true)) {
            $errors['decision'] = 'Pilih penilaian setoran.';
        }
        if (mb_strlen($notes) > 2000) {
            $errors['notes'] = 'Catatan maksimal 2000 karakter.';
        }
        if ($pageNo !== null && ($pageNo < 1 || $pageNo > 604)) {
            $errors['page_no'] = 'Nomor halaman antara 1 dan 604.';
        }
        if ($errors !== []) {
            throw new RegistrationException('Data setoran belum valid.', 422, $errors);
        }

        $halaqahId = $this->requireReviewerHalaqah($actor, $pondokId, $userId);
        $submissionId = (int) ($input['submission_id'] ?? 0);

        // Penilaian boleh menempel pada satu rekaman setoran (menandai sudah dinilai).
        if ($submissionId > 0) {
            $check = $this->pdo->prepare(
                'SELECT id FROM setoran_submissions
                 WHERE id = :id AND user_id = :user_id AND pondok_id = :pondok_id AND deleted_at IS NULL
                 LIMIT 1'
            );
            $check->execute([
                'id' => $submissionId,
                'user_id' => $userId,
                'pondok_id' => $pondokId,
            ]);
            if ($check->fetchColumn() === false) {
                throw new RegistrationException('Rekaman setoran tidak ditemukan.', 404, [
                    'submission_id' => 'Rekaman setoran tidak ditemukan.',
                ]);
            }
        }

        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            $statement = $this->pdo->prepare(
                'INSERT INTO setoran_reviews (user_id, pondok_id, halaqah_id, ref, page_no, decision, notes, created_by)
                 VALUES (:user_id, :pondok_id, :halaqah_id, :ref, :page_no, :decision, :notes, :created_by)'
            );
            $statement->execute([
                'user_id' => $userId,
                'pondok_id' => $pondokId,
                'halaqah_id' => $halaqahId,
                'ref' => $ref,
                'page_no' => $pageNo,
                'decision' => $decision,
                'notes' => $notes === '' ? null : $notes,
                'created_by' => (int) $actor['id'],
            ]);
            $reviewId = (int) $this->pdo->lastInsertId();

            if ($submissionId > 0) {
                $this->pdo->prepare(
                    "UPDATE setoran_submissions
                        SET status = 'reviewed',
                            reviewed_by = :reviewed_by,
                            reviewed_at = CURRENT_TIMESTAMP(3)
                      WHERE id = :id"
                )->execute(['reviewed_by' => (int) $actor['id'], 'id' => $submissionId]);
            }

            if ($ownsTransaction) {
                $this->pdo->commit();
            }
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }

        return [
            'id' => $reviewId,
            'submission_id' => $submissionId > 0 ? $submissionId : null,
            'ref' => $ref,
            'page_no' => $pageNo,
            'decision' => $decision,
            'notes' => $notes === '' ? null : $notes,
            'halaqah_id' => $halaqahId,
        ];
    }

    /** @param array{id:int, roles:string[]} $actor @return array{id:int} */
    public function remove(array $actor, int $id): array
    {
        $statement = $this->pdo->prepare(
            'SELECT id, user_id, pondok_id, created_by FROM setoran_reviews
             WHERE id = :id AND deleted_at IS NULL LIMIT 1'
        );
        $statement->execute(['id' => $id]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        if (!is_array($row)) {
            throw new RegistrationException('Penilaian setoran tidak ditemukan.', 404, [
                'id' => 'Penilaian setoran tidak ditemukan.',
            ]);
        }

        // Wajib tetap musyrif halaqah santri itu, dan hanya pembuatnya sendiri.
        $this->requireReviewerHalaqah($actor, (int) $row['pondok_id'], (int) $row['user_id']);
        if (!in_array('super_admin', $actor['roles'] ?? [], true) && (int) $row['created_by'] !== (int) $actor['id']) {
            throw new RegistrationException('Hanya penilai awal yang boleh menghapus penilaian ini.', 403, []);
        }

        $delete = $this->pdo->prepare('UPDATE setoran_reviews SET deleted_at = NOW(3) WHERE id = :id');
        $delete->execute(['id' => $id]);

        return ['id' => $id];
    }

    /** Santri selalu boleh melihat nilainya sendiri; selain itu admin/musyrif halaqah. */
    private function assertCanView(array $actor, int $pondokId, int $userId): void
    {
        if (in_array('super_admin', $actor['roles'] ?? [], true)) {
            return;
        }
        if ((int) ($actor['id'] ?? 0) === $userId) {
            return;
        }

        $admin = $this->pdo->prepare(
            "SELECT 1 FROM pondok_memberships
             WHERE pondok_id = :pondok_id AND user_id = :user_id
               AND role = 'admin' AND status = 'active' LIMIT 1"
        );
        $admin->execute(['pondok_id' => $pondokId, 'user_id' => (int) $actor['id']]);
        if ($admin->fetchColumn() !== false) {
            return;
        }

        if ($this->reviewerHalaqahId($actor, $pondokId, $userId) > 0) {
            return;
        }

        throw new RegistrationException(
            'Hanya admin pondok, musyrif halaqah, atau santri itu sendiri yang boleh melihat penilaian setoran.',
            403
        );
    }

    /**
     * Menilai hanya untuk musyrif halaqah santri itu (admin pondok tidak ikut
     * menilai, sesuai keputusan penggunaan). Mengembalikan halaqah santri.
     */
    private function requireReviewerHalaqah(array $actor, int $pondokId, int $userId): int
    {
        if ($pondokId < 1 || $userId < 1) {
            throw new RegistrationException('Santri wajib dipilih.', 422, ['user_id' => 'Santri wajib dipilih.']);
        }

        $halaqahId = $this->reviewerHalaqahId($actor, $pondokId, $userId);
        if ($halaqahId < 1) {
            if (!in_array('musyrif', $actor['roles'] ?? [], true)) {
                throw new RegistrationException('Hanya musyrif yang boleh menilai setoran.', 403, []);
            }
            throw new RegistrationException('Hanya musyrif halaqah santri ini yang boleh menilai setoran.', 403, []);
        }

        return $halaqahId;
    }

    /** @return int 0 kalau login ini bukan musyrif halaqah santri tersebut */
    private function reviewerHalaqahId(array $actor, int $pondokId, int $userId): int
    {
        if (!in_array('musyrif', $actor['roles'] ?? [], true)) {
            return 0;
        }

        $statement = $this->pdo->prepare(
            'SELECT hm.halaqah_id
             FROM halaqah_memberships hm
             JOIN halaqahs h ON h.id = hm.halaqah_id AND h.deleted_at IS NULL
             JOIN musyrif_profiles mp ON mp.id = h.musyrif_profile_id
             WHERE hm.user_id = :student_id AND hm.status = \'active\'
               AND h.pondok_id = :pondok_id AND h.status = \'active\'
               AND mp.user_id = :musyrif_id
             LIMIT 1'
        );
        $statement->execute([
            'student_id' => $userId,
            'pondok_id' => $pondokId,
            'musyrif_id' => (int) $actor['id'],
        ]);
        $halaqahId = $statement->fetchColumn();

        return $halaqahId === false ? 0 : (int) $halaqahId;
    }
}
