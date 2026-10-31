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
        $q = $this->pdo->prepare("SELECT meta_value, on_off FROM user_meta WHERE user_id = :id AND meta_key = 'donation_bank' LIMIT 1");
        $q->execute(['id' => $userId]);
        $bankMeta = $q->fetch(PDO::FETCH_ASSOC);
        $bankValue = is_array($bankMeta) ? json_decode((string) $bankMeta['meta_value'], true) : null;
        $bank = is_array($bankValue) ? [
            'bank_name' => (string) ($bankValue['bank_name'] ?? ''),
            'account_number' => (string) ($bankValue['account_number'] ?? ''),
            'account_holder' => (string) ($bankValue['account_holder'] ?? ''),
            'is_public' => (int) $bankMeta['on_off'] === 1,
        ] : null;
        $h = $this->pdo->prepare("SELECT id, name FROM halaqahs WHERE musyrif_profile_id = :id AND deleted_at IS NULL AND status = 'active' ORDER BY name");
        $h->execute(['id' => $profileId]);
        $p = $this->pdo->prepare('SELECT id, halaqah_id, created_at, on_off FROM halaqah_photos WHERE user_id = :id AND on_off = 1 ORDER BY created_at DESC LIMIT 30');
        $p->execute(['id' => $userId]);
        return [
            'bank' => $bank,
            'halaqahs' => array_map(static fn (array $v): array => ['id' => (int) $v['id'], 'name' => $v['name']], $h->fetchAll(PDO::FETCH_ASSOC)),
            'photos' => array_map(static fn (array $v): array => [
                'id' => (int) $v['id'], 'halaqah_id' => (int) $v['halaqah_id'],
                'caption' => 'Aktivitas Halaqah', 'created_at' => $v['created_at'],
                'on_off' => (int) $v['on_off'],
                'url' => '/api/public/ustadz/photo?id=' . (int) $v['id'],
            ], $p->fetchAll(PDO::FETCH_ASSOC)),
        ];
    }

    public function saveBank(int $userId, array $input): void
    {
        $this->profileId($userId);
        $name = trim((string) ($input['bank_name'] ?? ''));
        $accountNumber = preg_replace('/[\s-]+/', '', (string) ($input['account_number'] ?? '')) ?? '';
        $holder = trim((string) ($input['account_holder'] ?? ''));
        $public = ($input['is_public'] ?? false) === true;
        if (mb_strlen($name) < 2 || mb_strlen($name) > 100 ||
            !preg_match('/^[0-9]{5,30}$/', $accountNumber) ||
            mb_strlen($holder) < 3 || mb_strlen($holder) > 150) {
            throw new RegistrationException('Isi nama bank, nomor rekening 5-30 digit, dan nama penerima dengan benar.', 422);
        }
        $metaValue = json_encode([
            'bank_name' => $name,
            'account_number' => $accountNumber,
            'account_holder' => $holder,
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        $q = $this->pdo->prepare(
            "INSERT INTO user_meta (user_id, meta_key, meta_value, on_off)
             VALUES (:id, 'donation_bank', :value, :enabled)
             ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value), on_off = VALUES(on_off)"
        );
        $q->execute(['id' => $userId, 'value' => $metaValue, 'enabled' => $public ? 1 : 0]);
    }

    public function uploadPhoto(int $userId, array $input, array $upload): void
    {
        $profileId = $this->profileId($userId);
        if (($input['consent'] ?? '') !== 'yes') {
            throw new RegistrationException('Konfirmasi izin publikasi foto diperlukan.', 422);
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
        $count = $this->pdo->prepare('SELECT COUNT(*) FROM halaqah_photos WHERE user_id = :user_id');
        $count->execute(['user_id' => $userId]);
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
        if (!is_dir($directory) && !@mkdir($directory, 0750, true) && !is_dir($directory)) {
            imagedestroy($target);
            throw new RegistrationException('Folder penyimpanan foto tidak dapat dibuat. Hubungi admin server untuk memperbaiki izin direktori.', 503);
        }
        if (!is_writable($directory)) {
            imagedestroy($target);
            throw new RegistrationException('Folder penyimpanan foto tidak memiliki izin tulis. Hubungi admin server.', 503);
        }
        $filename = bin2hex(random_bytes(16)) . '.jpg';
        $path = $directory . '/' . $filename;
        $saved = @imagejpeg($target, $path, 82);
        imagedestroy($target);
        if (!$saved) {
            @unlink($path);
            throw new RegistrationException('Foto gagal ditulis ke server. Periksa izin folder penyimpanan dan ruang disk.', 503);
        }
        try {
            $q = $this->pdo->prepare(
                'INSERT INTO halaqah_photos (user_id, halaqah_id, filename, on_off)
                 VALUES (:user_id, :halaqah, :filename, 1)'
            );
            $q->execute(['user_id' => $userId, 'halaqah' => $halaqahId, 'filename' => $filename]);
        } catch (\Throwable $e) {
            @unlink($path);
            throw $e;
        }
    }

    public function deletePhoto(int $userId, int $id): void
    {
        $this->profileId($userId);
        $q = $this->pdo->prepare('SELECT filename FROM halaqah_photos WHERE id = :id AND user_id = :user_id LIMIT 1');
        $q->execute(['id' => $id, 'user_id' => $userId]);
        $filename = $q->fetchColumn();
        if (!is_string($filename)) {
            throw new RegistrationException('Foto tidak ditemukan.', 404);
        }
        $delete = $this->pdo->prepare('DELETE FROM halaqah_photos WHERE id = :id AND user_id = :user_id');
        $delete->execute(['id' => $id, 'user_id' => $userId]);
        if (preg_match('/^[a-f0-9]{32}\.jpg$/', $filename)) {
            @unlink(dirname(__DIR__, 3) . '/storage/ustadz-activities/' . $filename);
        }
    }
}
