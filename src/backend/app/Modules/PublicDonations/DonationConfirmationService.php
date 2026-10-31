<?php

declare(strict_types=1);

namespace App\Modules\PublicDonations;

use App\Modules\Auth\RegistrationException;
use DateTimeImmutable;
use DateTimeZone;
use PDO;

final class DonationConfirmationService
{
    private const STORAGE = '/storage/donation-proofs';

    public function __construct(private readonly PDO $pdo)
    {
    }

    public function confirm(int $donorId, array $input, array $upload): int
    {
        $profileId = filter_var($input['ustadz_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $amount = filter_var($input['amount_idr'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if (!$profileId || !$amount || $amount > 1000000000000) {
            throw new RegistrationException('Pilih ustadz dan isi nominal transfer yang benar.', 422);
        }
        $date = (string) ($input['sent_at'] ?? '');
        $tz = new DateTimeZone('Asia/Jakarta');
        $sentAt = DateTimeImmutable::createFromFormat('!Y-m-d\\TH:i', $date, $tz);
        if (!$sentAt || $sentAt->format('Y-m-d\\TH:i') !== $date) {
            throw new RegistrationException('Isi tanggal dan waktu transfer yang benar.', 422);
        }
        $now = new DateTimeImmutable('now', $tz);
        if ($sentAt > $now->modify('+1 day') || $sentAt < $now->modify('-1 year')) {
            throw new RegistrationException('Tanggal transfer di luar rentang yang diperbolehkan.', 422);
        }

        // Hanya ustadz dengan rekening donasi yang telah dipublikasikan yang boleh menerima konfirmasi.
        $stmt = $this->pdo->prepare(
            "SELECT mp.user_id FROM musyrif_profiles mp
             JOIN users u ON u.id = mp.user_id AND u.status = 'active' AND u.deleted_at IS NULL
             LEFT JOIN pondoks p ON p.id = mp.pondok_id AND p.status = 'active' AND p.deleted_at IS NULL
             JOIN user_meta bank ON bank.user_id = mp.user_id AND bank.meta_key = 'donation_bank' AND bank.on_off = 'on'
             WHERE mp.id = :id AND mp.status = 'active' AND (mp.type = 'platform' OR p.id IS NOT NULL)
             LIMIT 1"
        );
        $stmt->execute(['id' => $profileId]);
        $recipientId = $stmt->fetchColumn();
        if ($recipientId === false) {
            throw new RegistrationException('Rekening donasi ustadz belum tersedia.', 404);
        }
        if (($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file((string) ($upload['tmp_name'] ?? ''))) {
            throw new RegistrationException('Ambil atau upload foto bukti transfer terlebih dahulu.', 422);
        }
        $size = (int) ($upload['size'] ?? 0);
        if ($size < 100 || $size > 5 * 1024 * 1024) {
            throw new RegistrationException('Ukuran foto bukti transfer maksimal 5 MB.', 422);
        }
        $tmp = (string) $upload['tmp_name'];
        $info = @getimagesize($tmp);
        if (!$info || !in_array($info['mime'] ?? '', ['image/jpeg', 'image/png', 'image/webp'], true)
            || (int) $info[0] < 100 || (int) $info[1] < 100
            || (int) $info[0] > 5000 || (int) $info[1] > 5000) {
            throw new RegistrationException('Bukti transfer harus berupa foto JPG, PNG, atau WebP.', 422);
        }
        if (!function_exists('imagecreatefromstring')) {
            throw new RegistrationException('Server belum mendukung pemrosesan gambar (PHP GD).', 503);
        }
        $raw = file_get_contents($tmp);
        $image = $raw !== false ? @imagecreatefromstring($raw) : false;
        if ($image === false) {
            throw new RegistrationException('Foto bukti transfer tidak dapat dibaca.', 422);
        }
        $width = imagesx($image);
        $height = imagesy($image);
        $scale = min(1, 1800 / max($width, $height));
        $outWidth = max(1, (int) round($width * $scale));
        $outHeight = max(1, (int) round($height * $scale));
        $target = imagecreatetruecolor($outWidth, $outHeight);
        $white = imagecolorallocate($target, 255, 255, 255);
        imagefill($target, 0, 0, $white);
        imagecopyresampled($target, $image, 0, 0, 0, 0, $outWidth, $outHeight, $width, $height);
        imagedestroy($image);

        $directory = dirname(__DIR__, 3) . self::STORAGE;
        if ((!is_dir($directory) && !@mkdir($directory, 0750, true) && !is_dir($directory)) || !is_writable($directory)) {
            imagedestroy($target);
            throw new RegistrationException('Folder bukti transfer belum memiliki izin tulis. Hubungi admin server.', 503);
        }
        $filename = bin2hex(random_bytes(16)) . '.jpg';
        $path = $directory . '/' . $filename;
        $saved = @imagejpeg($target, $path, 84);
        imagedestroy($target);
        if (!$saved) {
            @unlink($path);
            throw new RegistrationException('Gagal menyimpan foto bukti transfer di server.', 503);
        }
        try {
            $this->pdo->beginTransaction();
            $insert = $this->pdo->prepare(
                "INSERT INTO donation_transfers
                 (musyrif_profile_id, donor_user_id, amount_idr, proof_filename, sent_at, status)
                 VALUES (:profile, :donor, :amount, :proof, :sent_at, 'reported')"
            );
            $insert->execute([
                'profile' => $profileId,
                'donor' => $donorId,
                'amount' => $amount,
                'proof' => $filename,
                'sent_at' => $sentAt->format('Y-m-d H:i:s'),
            ]);
            $id = (int) $this->pdo->lastInsertId();
            $notify = $this->pdo->prepare(
                "INSERT INTO notifications (user_id, type, title, body, payload)
                 VALUES (:recipient, 'donation_reported', 'Konfirmasi bukti transfer',
                         'Ada bukti transfer donasi baru yang menunggu pemeriksaan.',
                         :payload)"
            );
            $notify->execute([
                'recipient' => (int) $recipientId,
                'payload' => json_encode(['donation_transfer_id' => $id], JSON_THROW_ON_ERROR),
            ]);
            $this->pdo->commit();
            return $id;
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            @unlink($path);
            throw $e;
        }
    }

    public function recipientReports(int $ustadzUserId): array
    {
        $q = $this->pdo->prepare(
            "SELECT dt.id, dt.amount_idr, dt.sent_at, dt.status, dt.created_at, u.name AS donor_name
             FROM donation_transfers dt
             JOIN musyrif_profiles mp ON mp.id = dt.musyrif_profile_id
             LEFT JOIN users u ON u.id = dt.donor_user_id
             WHERE mp.user_id = :user_id
             ORDER BY dt.created_at DESC, dt.id DESC LIMIT 100"
        );
        $q->execute(['user_id' => $ustadzUserId]);
        return $q->fetchAll(PDO::FETCH_ASSOC);
    }

    public function proofForUser(int $actorId, int $transferId): string
    {
        $q = $this->pdo->prepare(
            'SELECT dt.proof_filename, dt.donor_user_id, mp.user_id AS ustadz_user_id
             FROM donation_transfers dt
             JOIN musyrif_profiles mp ON mp.id = dt.musyrif_profile_id
             WHERE dt.id = :id LIMIT 1'
        );
        $q->execute(['id' => $transferId]);
        $row = $q->fetch(PDO::FETCH_ASSOC);
        if (!$row || ($actorId !== (int) $row['donor_user_id'] && $actorId !== (int) $row['ustadz_user_id'])) {
            throw new RegistrationException('Bukti transfer tidak ditemukan.', 404);
        }
        $filename = (string) ($row['proof_filename'] ?? '');
        if (!preg_match('/^[a-f0-9]{32}\\.jpg$/', $filename)) {
            throw new RegistrationException('Bukti transfer tidak ditemukan.', 404);
        }
        $path = dirname(__DIR__, 3) . self::STORAGE . '/' . $filename;
        if (!is_file($path)) {
            throw new RegistrationException('Foto bukti transfer belum tersedia.', 404);
        }
        return $path;
    }

    public function review(int $ustadzUserId, int $transferId, string $decision): void
    {
        if (!in_array($decision, ['verified', 'rejected'], true)) {
            throw new RegistrationException('Keputusan verifikasi tidak valid.', 422);
        }
        $q = $this->pdo->prepare(
            "UPDATE donation_transfers dt
             JOIN musyrif_profiles mp ON mp.id = dt.musyrif_profile_id
             SET dt.status = :status,
                 dt.verified_by = CASE WHEN :approved = 1 THEN :verifier ELSE NULL END,
                 dt.verified_at = CASE WHEN :approved_at = 1 THEN CURRENT_TIMESTAMP(3) ELSE NULL END
             WHERE dt.id = :id AND dt.status = 'reported' AND mp.user_id = :ustadz_id"
        );
        $q->execute([
            'status' => $decision, 'approved' => $decision === 'verified' ? 1 : 0,
            'approved_at' => $decision === 'verified' ? 1 : 0,
            'verifier' => $ustadzUserId, 'id' => $transferId, 'ustadz_id' => $ustadzUserId,
        ]);
        if ($q->rowCount() !== 1) {
            throw new RegistrationException('Laporan tidak ditemukan atau sudah diperiksa.', 409);
        }
    }
}
