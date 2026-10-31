<?php

declare(strict_types=1);

namespace App\Modules\PublicDonations;

use App\Modules\Auth\RegistrationException;
use PDO;

final class UstadzDonationProfileService
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    private function profileId(int $userId): int
    {
        $q = $this->pdo->prepare(
            "SELECT mp.id FROM musyrif_profiles mp JOIN users u ON u.id = mp.user_id
             WHERE mp.user_id = :id AND mp.status = 'active' AND u.status = 'active' AND u.deleted_at IS NULL LIMIT 1"
        );
        $q->execute(['id' => $userId]);
        $id = $q->fetchColumn();
        if ($id === false) {
            throw new RegistrationException('Akun ini bukan ustadz aktif.', 403);
        }
        return (int) $id;
    }

    public function show(int $userId): array
    {
        $profileId = $this->profileId($userId);
        $q = $this->pdo->prepare('SELECT bank_name, account_number, account_holder, is_public FROM ustadz_public_banks WHERE musyrif_profile_id = :id');
        $q->execute(['id' => $profileId]);
        $bank = $q->fetch(PDO::FETCH_ASSOC);
        $h = $this->pdo->prepare("SELECT id, name FROM halaqahs WHERE musyrif_profile_id = :id AND deleted_at IS NULL AND status = 'active' ORDER BY name");
        $h->execute(['id' => $profileId]);
        $p = $this->pdo->prepare('SELECT id, halaqah_id, caption, created_at FROM ustadz_activity_photos WHERE musyrif_profile_id = :id ORDER BY created_at DESC LIMIT 30');
        $p->execute(['id' => $profileId]);
        return [
            'bank' => $bank === false ? null : [
                'bank_name' => (string) $bank['bank_name'],
                'account_number' => (string) $bank['account_number'],
                'account_holder' => (string) $bank['account_holder'],
                'is_public' => (bool) $bank['is_public'],
            ],
            'halaqahs' => array_map(static fn (array $v): array => ['id' => (int) $v['id'], 'name' => $v['name']], $h->fetchAll(PDO::FETCH_ASSOC)),
            'photos' => array_map(static fn (array $v): array => [
                'id' => (int) $v['id'], 'halaqah_id' => $v['halaqah_id'] !== null ? (int) $v['halaqah_id'] : null,
                'caption' => $v['caption'], 'created_at' => $v['created_at'],
                'url' => '/api/public/ustadz/photo?id=' . (int) $v['id'],
            ], $p->fetchAll(PDO::FETCH_ASSOC)),
        ];
    }

    public function saveBank(int $userId, array $input): void
    {
        $id = $this->profileId($userId);
        $name = trim((string) ($input['bank_name'] ?? ''));
        $accountNumber = preg_replace('/[\s-]+/', '', (string) ($input['account_number'] ?? '')) ?? '';
        $holder = trim((string) ($input['account_holder'] ?? ''));
        $public = ($input['is_public'] ?? false) === true;
        if (mb_strlen($name) < 2 || mb_strlen($name) > 100 ||
            !preg_match('/^[0-9]{5,30}$/', $accountNumber) ||
            mb_strlen($holder) < 3 || mb_strlen($holder) > 150) {
            throw new RegistrationException('Isi nama bank, nomor rekening 5-30 digit, dan nama penerima dengan benar.', 422);
        }
        $q = $this->pdo->prepare(
            'INSERT INTO ustadz_public_banks (musyrif_profile_id, bank_name, account_number, account_holder, is_public)
             VALUES (:id,:bank,:number,:holder,:pub)
             ON DUPLICATE KEY UPDATE bank_name = VALUES(bank_name), account_number = VALUES(account_number),
             account_holder = VALUES(account_holder), is_public = VALUES(is_public)'
        );
        $q->execute(['id' => $id, 'bank' => $name, 'number' => $accountNumber, 'holder' => $holder, 'pub' => $public ? 1 : 0]);
    }

    public function uploadPhoto(int $userId, array $input, array $upload): void
    {
        $profileId = $this->profileId($userId);
        if (($input['consent'] ?? '') !== 'yes') {
            throw new RegistrationException('Konfirmasi izin publikasi foto diperlukan.', 422);
        }
        $caption = trim((string) ($input['caption'] ?? ''));
        if ($caption === '') {
            $caption = 'Aktivitas Halaqah';
        }
        if (mb_strlen($caption) < 3 || mb_strlen($caption) > 180) {
            throw new RegistrationException('Keterangan foto harus 3-180 karakter.', 422);
        }
        $halaqahId = filter_var($input['halaqah_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) ?: null;
        if ($halaqahId === null) {
            throw new RegistrationException('Halaqah wajib dipilih untuk setiap foto aktivitas.', 422);
        }
        if ($halaqahId !== null) {
            $h = $this->pdo->prepare("SELECT 1 FROM halaqahs WHERE id = :id AND musyrif_profile_id = :profile AND status = 'active' AND deleted_at IS NULL");
            $h->execute(['id' => $halaqahId, 'profile' => $profileId]);
            if ($h->fetchColumn() === false) {
                throw new RegistrationException('Halaqah tidak sesuai dengan akun.', 403);
            }
        }
        $count = $this->pdo->prepare('SELECT COUNT(*) FROM ustadz_activity_photos WHERE musyrif_profile_id = :profile');
        $count->execute(['profile' => $profileId]);
        if ((int) $count->fetchColumn() >= 30) {
            throw new RegistrationException('Maksimal 30 foto. Hapus foto lama sebelum mengunggah.', 422);
        }
        if (($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK ||
            !is_uploaded_file((string) ($upload['tmp_name'] ?? ''))) {
            throw new RegistrationException('Foto belum berhasil diunggah. Pastikan ukuran tidak melebihi batas server.', 422);
        }
        $tmp = (string) $upload['tmp_name'];
        $size = (int) ($upload['size'] ?? 0);
        if ($size < 100 || $size > 2 * 1024 * 1024) {
            throw new RegistrationException('Foto harus berukuran maksimal 2 MB.', 422);
        }
        $info = @getimagesize($tmp);
        if ($info === false || !in_array($info['mime'] ?? '', ['image/jpeg', 'image/png', 'image/webp'], true) ||
            (int) $info[0] > 4000 || (int) $info[1] > 4000 ||
            (int) $info[0] < 100 || (int) $info[1] < 100) {
            throw new RegistrationException('Foto harus JPG, PNG, atau WebP dengan dimensi wajar.', 422);
        }
        if (!function_exists('imagecreatefromstring')) {
            throw new RegistrationException('Server belum mendukung pemrosesan gambar (PHP GD).', 503);
        }
        $raw = file_get_contents($tmp);
        $source = $raw !== false ? @imagecreatefromstring($raw) : false;
        if ($source === false) {
            throw new RegistrationException('Berkas foto tidak bisa dibaca.', 422);
        }
        $originalWidth = imagesx($source);
        $originalHeight = imagesy($source);
        $ratio = min(1, 1400 / max($originalWidth, $originalHeight));
        $width = max(1, (int) round($originalWidth * $ratio));
        $height = max(1, (int) round($originalHeight * $ratio));
        $target = imagecreatetruecolor($width, $height);
        $white = imagecolorallocate($target, 255, 255, 255);
        imagefill($target, 0, 0, $white);
        imagecopyresampled($target, $source, 0, 0, 0, 0, $width, $height, $originalWidth, $originalHeight);
        imagedestroy($source);
        $directory = dirname(__DIR__, 3) . '/storage/ustadz-activities';
        if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
            imagedestroy($target);
            throw new \RuntimeException('Direktori foto tidak dapat dibuat.');
        }
        $filename = bin2hex(random_bytes(16)) . '.jpg';
        $path = $directory . '/' . $filename;
        $saved = imagejpeg($target, $path, 82);
        imagedestroy($target);
        if (!$saved) {
            throw new \RuntimeException('Gagal menyimpan foto.');
        }
        try {
            $q = $this->pdo->prepare(
                'INSERT INTO ustadz_activity_photos
                 (musyrif_profile_id, halaqah_id, filename, caption, published, consent_confirmed_at)
                 VALUES (:profile, :halaqah, :filename, :caption, 1, CURRENT_TIMESTAMP(3))'
            );
            $q->execute(['profile' => $profileId, 'halaqah' => $halaqahId, 'filename' => $filename, 'caption' => $caption]);
        } catch (\Throwable $e) {
            @unlink($path);
            throw $e;
        }
    }

    public function deletePhoto(int $userId, int $id): void
    {
        $profileId = $this->profileId($userId);
        $q = $this->pdo->prepare('SELECT filename FROM ustadz_activity_photos WHERE id = :id AND musyrif_profile_id = :profile LIMIT 1');
        $q->execute(['id' => $id, 'profile' => $profileId]);
        $filename = $q->fetchColumn();
        if (!is_string($filename)) {
            throw new RegistrationException('Foto tidak ditemukan.', 404);
        }
        $delete = $this->pdo->prepare('DELETE FROM ustadz_activity_photos WHERE id = :id AND musyrif_profile_id = :profile');
        $delete->execute(['id' => $id, 'profile' => $profileId]);
        if (preg_match('/^[a-f0-9]{32}\.jpg$/', $filename)) {
            @unlink(dirname(__DIR__, 3) . '/storage/ustadz-activities/' . $filename);
        }
    }
}
