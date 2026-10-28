<?php

declare(strict_types=1);

namespace App\Modules\Musyrifs;

use App\Core\SmtpMailer;
use App\Core\WaGateway;
use App\Core\WaSender;
use App\Modules\Auth\RegisterRepository;
use App\Modules\Auth\RegistrationException;
use PDO;
use PDOException;

final class InviteService
{
    private const EXPIRY_DAYS = 7;

    public function __construct(
        private readonly PDO $pdo,
        private readonly RegisterRepository $accounts,
    ) {
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function create(array $actor, array $input): array
    {
        $pondokId = (int) ($input['pondok_id'] ?? 0);
        $role = strtolower(trim((string) ($input['role'] ?? 'musyrif')));
        $name = trim((string) ($input['name'] ?? ''));
        $phoneRaw = trim((string) ($input['phone'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $phone = $phoneRaw === '' ? null : $this->normalizePhone($phoneRaw);
        $halaqahId = (int) ($input['halaqah_id'] ?? 0);
        $fromHalaqahId = (int) ($input['from_halaqah_id'] ?? 0);
        $isTransfer = !empty($input['is_transfer']);

        $errors = [];
        if ($pondokId <= 0) {
            $errors['pondok_id'] = 'Pondok wajib dipilih.';
        }
        if (!in_array($role, ['musyrif', 'santri'], true)) {
            $errors['role'] = 'Role undangan harus ustadz atau santri.';
        }
        if ($isTransfer && $role !== 'santri') {
            $errors['halaqah_id'] = 'Pindah halaqah hanya berlaku untuk undangan santri.';
        }
        if ($isTransfer && $halaqahId <= 0) {
            $errors['halaqah_id'] = 'Pilih halaqah tujuan untuk pindah halaqah.';
        }
        if ($name !== '' && (mb_strlen($name) < 2 || mb_strlen($name) > 150)) {
            $errors['name'] = 'Nama harus 2-150 karakter.';
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
            $errors['email'] = 'Email tidak valid.';
        }
        if ($phoneRaw !== '' && $phone === null) {
            $errors['phone'] = 'Nomor WhatsApp tidak valid.';
        }
        if ($errors !== []) {
            throw new RegistrationException('Data undangan belum valid.', 422, $errors);
        }
        if ($name === '') {
            $name = substr($email, 0, (int) strpos($email, '@'));
        }

        PondokAccess::assertPondokAdmin($this->pdo, $actor, $pondokId);

        $pondok = $this->pdo->prepare(
            "SELECT id, name FROM pondoks WHERE id = :id AND status = 'active' LIMIT 1"
        );
        $pondok->execute(['id' => $pondokId]);
        $pondokRow = $pondok->fetch(PDO::FETCH_ASSOC);
        if (!is_array($pondokRow)) {
            throw new RegistrationException('Pondok tidak ditemukan.', 404);
        }

        // Halaqah tujuan wajib milik pondok yang sama dan masih berjalan programnya.
        $targetHalaqah = null;
        if ($halaqahId > 0) {
            if ($role !== 'santri') {
                throw new RegistrationException('Pilihan halaqah hanya untuk undangan santri.', 422, [
                    'halaqah_id' => 'Pilihan halaqah hanya untuk undangan santri.',
                ]);
            }
            $targetHalaqah = $this->halaqahRow($halaqahId, $pondokId);
            if ($targetHalaqah === null) {
                throw new RegistrationException('Halaqah tujuan tidak ditemukan di pondok ini.', 422, [
                    'halaqah_id' => 'Halaqah tujuan tidak ditemukan di pondok ini.',
                ]);
            }
            if ($targetHalaqah['status'] !== 'active') {
                throw new RegistrationException('Halaqah tujuan sedang tidak aktif.', 422, [
                    'halaqah_id' => 'Halaqah tujuan sedang tidak aktif.',
                ]);
            }
            $this->assertProgramRunning($targetHalaqah, 'tujuan');
        }

        $existingStmt = $this->pdo->prepare('SELECT id, phone_e164, status FROM users WHERE email = :email LIMIT 1');
        $existingStmt->execute(['email' => $email]);
        $existing = $existingStmt->fetch(PDO::FETCH_ASSOC);
        if ($phone === null && is_array($existing)) {
            $phone = (string) $existing['phone_e164'];
        }

        $sourceHalaqah = null;
        if ($isTransfer) {
            $sourceHalaqah = $this->assertTransferable($pondokId, $existing, $fromHalaqahId, (int) $targetHalaqah['id']);
            // Pindah halaqah menempatkan santri ke halaqah baru, jadi keanggotaan
            // pondoknya memang sudah ada — cek "sudah menjadi santri" tidak berlaku.
        } elseif (is_array($existing)) {
            // Undangan langsung menyasar halaqah hanya untuk santri yang belum
            // berada di halaqah mana pun. Kalau sudah, perpindahan wajib lewat
            // mode pindah halaqah supaya selalu membawa catatan.
            if ($halaqahId > 0) {
                $currentHalaqah = $this->pdo->prepare(
                    'SELECT h.name
                     FROM halaqah_memberships hm
                     JOIN halaqahs h ON h.id = hm.halaqah_id AND h.deleted_at IS NULL
                     WHERE hm.user_id = :user_id AND hm.status = \'active\' AND h.pondok_id = :pondok_id
                     LIMIT 1'
                );
                $currentHalaqah->execute(['user_id' => (int) $existing['id'], 'pondok_id' => $pondokId]);
                $currentName = $currentHalaqah->fetchColumn();
                if ($currentName !== false) {
                    throw new RegistrationException(
                        'Santri ini sudah berada di halaqah "' . (string) $currentName . '". '
                        . 'Nyalakan opsi "Pindah dari halaqah lama" bila ingin memindahkannya.',
                        422,
                        ['halaqah_id' => 'Nyalakan opsi pindah halaqah.']
                    );
                }
                // Penempatan ke halaqah sudah eksplisit, jadi keanggotaan pondok
                // yang sudah aktif bukan halangan — cek "sudah menjadi santri"
                // dilewati untuk undangan yang membawa pilihan halaqah.
            } else {
                $already = $this->pdo->prepare(
                    "SELECT 1 FROM pondok_memberships
                     WHERE pondok_id = :pondok_id AND user_id = :user_id AND role = :role AND status = 'active' LIMIT 1"
                );
                $already->execute(['pondok_id' => $pondokId, 'user_id' => (int) $existing['id'], 'role' => $role]);
                if ($already->fetchColumn() !== false) {
                    throw new RegistrationException('User ini sudah menjadi ' . $role . ' di pondok tersebut.', 409);
                }
            }
        }

        $token = bin2hex(random_bytes(32));
        $this->pdo->prepare(
            'INSERT INTO pondok_invites (pondok_id, role, halaqah_id, from_halaqah_id, is_transfer,
                                         token_hash, invited_email, invited_phone_e164, created_by, expires_at)
             VALUES (:pondok_id, :role, :halaqah_id, :from_halaqah_id, :is_transfer,
                     :token_hash, :email, :phone, :created_by, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 7 DAY))'
        )->execute([
            'pondok_id' => $pondokId,
            'role' => $role,
            'halaqah_id' => $halaqahId > 0 ? $halaqahId : null,
            // Halaqah asal dipakai dari hasil deteksi server ($sourceHalaqah),
            // bukan nilai mentah dari pengguna — bila frontend tidak mengirim
            // from_halaqah_id, nilainya 0 dan akan melanggar foreign key.
            'from_halaqah_id' => is_array($sourceHalaqah) ? (int) $sourceHalaqah['id'] : null,
            'is_transfer' => $isTransfer ? 1 : 0,
            'token_hash' => hash('sha256', $token),
            'email' => $email,
            'phone' => $phone,
            'created_by' => (int) $actor['id'],
        ]);
        $inviteId = (int) $this->pdo->lastInsertId();

        $baseUrl = rtrim((string) (getenv('APP_URL') ?: ''), '/');
        $link = $baseUrl . '/#terima-undangan?token=' . urlencode($token);
        $safePondok = $pondokRow['name'];
        $emailSent = $this->tryEmail(
            $email,
            'Undangan ' . ($role === 'musyrif' ? 'Ustadz' : 'Santri') . ' ' . $safePondok,
            "<p>Halo {$this->e($name)},</p>"
            . "<p>Anda diundang menjadi <strong>" . ($role === 'musyrif' ? 'Ustadz' : 'Santri') . '</strong> di <strong>' . $this->e($safePondok) . '</strong> (MetodeQu).</p>'
            . '<p>Klik link berikut untuk menerima undangan dan membuat password (berlaku 7 hari):</p>'
            . "<p><a href=\"{$link}\">Terima Undangan</a></p>"
            . "<p>Link: {$link}</p>"
        );
        $waSent = $phone !== null ? $this->tryWa(
            $phone,
            "Assalamu'alaikum {$name}, Anda diundang menjadi " . ($role === 'musyrif' ? 'Ustadz' : 'Santri')
            . " di {$safePondok} (MetodeQu). Terima di sini (7 hari): {$link}",
            (int) $pondokRow['id']
        ) : false;

        return [
            'id' => $inviteId,
            'link' => $link,
            'pondok' => ['id' => (int) $pondokRow['id'], 'name' => $safePondok],
            'role' => $role,
            'email' => $email,
            'email_sent' => $emailSent,
            'wa_sent' => $waSent,
            'is_transfer' => $isTransfer,
            'halaqah' => $targetHalaqah !== null
                ? ['id' => (int) $targetHalaqah['id'], 'name' => (string) $targetHalaqah['name']]
                : null,
            'from_halaqah' => $sourceHalaqah !== null
                ? ['id' => (int) $sourceHalaqah['id'], 'name' => (string) $sourceHalaqah['name']]
                : null,
        ];
    }

    /**
     * Buat banyak undangan sekaligus (maks 20). Per email dicoba satu per satu;
     * yang gagal tidak membatalkan yang lain.
     *
     * @param array{id:int,roles:string[]} $actor
     * @return array{sent:array<int,array{id:int,email:string}>,failed:array<int,array{email:string,message:string}>}
     */
    public function createBulk(array $actor, array $input): array
    {
        $raw = $input['emails'] ?? [];
        if (!is_array($raw)) {
            $raw = [$raw];
        }
        $emails = [];
        foreach ($raw as $email) {
            foreach (preg_split('/[\s,;]+/', (string) $email) ?: [] as $part) {
                $part = strtolower(trim($part));
                if ($part !== '' && !in_array($part, $emails, true)) {
                    $emails[] = $part;
                }
            }
        }
        $emails = array_slice($emails, 0, 20);
        if ($emails === []) {
            throw new RegistrationException('Isi minimal satu email.', 422, ['email' => 'Isi minimal satu email.']);
        }

        $sent = [];
        $failed = [];
        foreach ($emails as $email) {
            try {
                $invite = $this->create($actor, [
                    'pondok_id' => $input['pondok_id'] ?? 0,
                    'role' => $input['role'] ?? 'musyrif',
                    'email' => $email,
                ]);
                $sent[] = ['id' => $invite['id'], 'email' => $email];
            } catch (RegistrationException $exception) {
                $failed[] = ['email' => $email, 'message' => $exception->getMessage()];
            }
        }

        return ['sent' => $sent, 'failed' => $failed];
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function list(array $actor, int $pondokId, string $role = ''): array
    {
        PondokAccess::assertPondokAdmin($this->pdo, $actor, $pondokId);

        $sql = 'SELECT id, role, invited_email, invited_phone_e164, status, expires_at, accepted_at, created_at
                FROM pondok_invites WHERE pondok_id = :pondok_id';
        $params = ['pondok_id' => $pondokId];
        if (in_array($role, ['musyrif', 'santri'], true)) {
            $sql .= ' AND role = :role';
            $params['role'] = $role;
        }
        $sql .= ' ORDER BY id DESC LIMIT 50';

        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        $rows = $statement->fetchAll(PDO::FETCH_ASSOC);
        return array_map(static fn(array $row) => $row + ['generic' => $row['invited_email'] === null], $rows);
    }

    /**
     * Buat link baru untuk undangan pending (link lama ikut mati, masa berlaku 7 hari lagi).
     * Dipakai tombol "Salin" di daftar undangan tanpa harus kirim ulang.
     *
     * @param array{id:int,roles:string[]} $actor
     * @return array{id:int,link:string,email:string,role:string,expires_at:string}
     */
    public function regenerateLink(array $actor, int $inviteId): array
    {
        $statement = $this->pdo->prepare(
            'SELECT id, pondok_id, role, invited_email, status FROM pondok_invites WHERE id = :id LIMIT 1'
        );
        $statement->execute(['id' => $inviteId]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row) || $row['status'] !== 'pending') {
            throw new RegistrationException('Undangan tidak ditemukan atau sudah tidak berlaku.', 404);
        }

        PondokAccess::assertPondokAdmin($this->pdo, $actor, (int) $row['pondok_id']);

        $token = bin2hex(random_bytes(32));
        $this->pdo->prepare(
            'UPDATE pondok_invites SET token_hash = :token_hash, expires_at = DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 7 DAY)
             WHERE id = :id AND status = \'pending\''
        )->execute(['token_hash' => hash('sha256', $token), 'id' => (int) $row['id']]);

        $baseUrl = rtrim((string) (getenv('APP_URL') ?: ''), '/');
        $expires = (string) $this->pdo->query(
            'SELECT expires_at FROM pondok_invites WHERE id = ' . (int) $row['id']
        )->fetchColumn();

        return [
            'id' => (int) $row['id'],
            'link' => $baseUrl . '/#terima-undangan?token=' . urlencode($token),
            'email' => (string) $row['invited_email'],
            'role' => (string) $row['role'],
            'expires_at' => $expires,
        ];
    }

    /**
     * Link undangan umum multi-pakai per pondok+role (tanpa email, tanpa kirim dulu).
     * Baris generik dipakai ulang; token plaintext disimpan agar link stabil.
     *
     * @param array{id:int,roles:string[]} $actor
     * @return array{id:int,link:string,role:string,pondok:array{id:int,name:string}}
     */
    public function standingLink(array $actor, int $pondokId, string $role): array
    {
        $role = strtolower(trim($role));
        if ($pondokId <= 0) {
            throw new RegistrationException('Pondok wajib dipilih.', 422);
        }
        if (!in_array($role, ['musyrif', 'santri'], true)) {
            throw new RegistrationException('Role undangan harus ustadz atau santri.', 422);
        }

        PondokAccess::assertPondokAdmin($this->pdo, $actor, $pondokId);

        $pondok = $this->pdo->prepare(
            "SELECT id, name FROM pondoks WHERE id = :id AND status = 'active' LIMIT 1"
        );
        $pondok->execute(['id' => $pondokId]);
        $pondokRow = $pondok->fetch(PDO::FETCH_ASSOC);
        if (!is_array($pondokRow)) {
            throw new RegistrationException('Pondok tidak ditemukan.', 404);
        }

        $existing = $this->pdo->prepare(
            "SELECT id, invite_token_plain FROM pondok_invites
              WHERE pondok_id = :pondok_id AND role = :role AND status = 'pending'
                AND invited_email IS NULL AND expires_at > CURRENT_TIMESTAMP(3)
              ORDER BY id DESC LIMIT 1"
        );
        $existing->execute(['pondok_id' => $pondokId, 'role' => $role]);
        $row = $existing->fetch(PDO::FETCH_ASSOC);

        $baseUrl = rtrim((string) (getenv('APP_URL') ?: ''), '/');

        if (is_array($row) && is_string($row['invite_token_plain']) && $row['invite_token_plain'] !== '') {
            return [
                'id' => (int) $row['id'],
                'link' => $baseUrl . '/#terima-undangan?token=' . urlencode($row['invite_token_plain']),
                'role' => $role,
                'pondok' => ['id' => (int) $pondokRow['id'], 'name' => (string) $pondokRow['name']],
            ];
        }

        $token = bin2hex(random_bytes(32));
        $this->pdo->prepare(
            'INSERT INTO pondok_invites (pondok_id, role, token_hash, invite_token_plain, invited_email, invited_phone_e164, created_by, expires_at)
             VALUES (:pondok_id, :role, :token_hash, :token_plain, NULL, NULL, :created_by, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 90 DAY))'
        )->execute([
            'pondok_id' => $pondokId,
            'role' => $role,
            'token_hash' => hash('sha256', $token),
            'token_plain' => $token,
            'created_by' => (int) $actor['id'],
        ]);

        return [
            'id' => (int) $this->pdo->lastInsertId(),
            'link' => $baseUrl . '/#terima-undangan?token=' . urlencode($token),
            'role' => $role,
            'pondok' => ['id' => (int) $pondokRow['id'], 'name' => (string) $pondokRow['name']],
        ];
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function revoke(array $actor, int $inviteId): bool    {
        $statement = $this->pdo->prepare(
            'SELECT pondok_id FROM pondok_invites WHERE id = :id AND status = \'pending\' LIMIT 1'
        );
        $statement->execute(['id' => $inviteId]);
        $pondokId = $statement->fetchColumn();
        if ($pondokId === false) {
            return false;
        }

        PondokAccess::assertPondokAdmin($this->pdo, $actor, (int) $pondokId);

        $update = $this->pdo->prepare(
            'UPDATE pondok_invites SET status = \'revoked\' WHERE id = :id AND status = \'pending\''
        );
        $update->execute(['id' => $inviteId]);
        return $update->rowCount() > 0;
    }

    /**
     * @return array{pondok_id:int,pondok_name:string,role:string,email:string,name_hint:string,
     *               expires_at:string,transfer:?array<string,mixed>}
     */
    public function info(string $token, ?string $emailInput = null): array
    {
        $row = $this->findValid($token);
        if ($row === null) {
            throw new RegistrationException('Undangan tidak valid atau sudah kedaluwarsa.', 410);
        }

        $pondok = $this->pdo->prepare('SELECT name FROM pondoks WHERE id = :id LIMIT 1');
        $pondok->execute(['id' => (int) $row['pondok_id']]);
        $pondokName = (string) $pondok->fetchColumn();

        $registered = null;
        $registeredName = null;
        $email = $row['invited_email'] !== null ? (string) $row['invited_email'] : null;
        $isGeneric = $email === null;
        $lookupEmail = $email;
        if ($isGeneric && $emailInput !== null) {
            $candidate = strtolower(trim($emailInput));
            if ($candidate !== '') {
                if (!filter_var($candidate, FILTER_VALIDATE_EMAIL) || mb_strlen($candidate) > 190) {
                    throw new RegistrationException('Email tidak valid.', 422, ['email' => 'Email tidak valid.']);
                }
                $lookupEmail = $candidate;
            }
        }
        if ($lookupEmail !== null) {
            $registeredStmt = $this->pdo->prepare('SELECT name FROM users WHERE email = :email LIMIT 1');
            $registeredStmt->execute(['email' => $lookupEmail]);
            $registeredName = $registeredStmt->fetchColumn();
            $registered = $registeredName !== false;
        }

        return [
            'pondok_id' => (int) $row['pondok_id'],
            'registered' => $registered === true,
            'registered_name' => is_string($registeredName) ? $registeredName : null,
            'generic' => $isGeneric,
            'pondok_name' => $pondokName,
            'role' => $row['role'],
            'email' => $email,
            'phone' => $row['invited_phone_e164'] !== null ? (string) $row['invited_phone_e164'] : null,
            'expires_at' => (string) $row['expires_at'],
            'transfer' => $this->transferInfo($row),
        ];
    }

    /**
     * Ringkasan pindah halaqah untuk halaman terima undangan, termasuk alasan
     * bila transfer tidak lagi bisa dijalankan (mis. program sudah selesai).
     *
     * @param array<string,mixed> $row
     * @return array<string,mixed>|null
     */
    private function transferInfo(array $row): ?array
    {
        if ((int) ($row['is_transfer'] ?? 0) !== 1 || (int) ($row['halaqah_id'] ?? 0) <= 0) {
            return null;
        }

        $pondokId = (int) $row['pondok_id'];
        $target = $this->halaqahRow((int) $row['halaqah_id'], $pondokId);
        $source = isset($row['from_halaqah_id']) && $row['from_halaqah_id'] !== null
            ? $this->halaqahRow((int) $row['from_halaqah_id'], $pondokId)
            : null;

        $blocked = null;
        if ($target === null) {
            $blocked = 'Halaqah tujuan sudah tidak tersedia.';
        } elseif ($target['status'] !== 'active') {
            $blocked = 'Halaqah tujuan sedang tidak aktif.';
        } else {
            try {
                $this->assertProgramRunning($target, 'tujuan');
            } catch (RegistrationException $exception) {
                $blocked = $exception->getMessage();
            }
        }
        if ($blocked === null && $source !== null) {
            try {
                $this->assertProgramRunning($source, 'asal');
            } catch (RegistrationException $exception) {
                $blocked = $exception->getMessage();
            }
        }

        return [
            'from_halaqah_id' => $source !== null ? (int) $source['id'] : (int) ($row['from_halaqah_id'] ?? 0),
            'from_halaqah_name' => $source !== null ? (string) $source['name'] : null,
            'to_halaqah_id' => (int) ($row['halaqah_id']),
            'to_halaqah_name' => $target !== null ? (string) $target['name'] : null,
            'blocked' => $blocked,
        ];
    }

    /**
     * @return array{user:array{id:int,name:string,username:string,email:string,phone_e164:string,email_verified_at:?string},pondok_id:int,role:string}
     */
    public function accept(string $token, string $name, string $password, ?string $phoneInput = null, ?string $loginPassword = null, ?int $actorUserId = null, ?string $emailInput = null): array
    {
        $name = trim($name);

        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            $invite = $this->findValid($token, true);
            if ($invite === null) {
                throw new RegistrationException('Undangan tidak valid atau sudah kedaluwarsa.', 410);
            }

            $email = $invite['invited_email'] !== null
                ? (string) $invite['invited_email']
                : strtolower(trim((string) $emailInput));
            if ($invite['invited_email'] === null) {
                if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
                    throw new RegistrationException('Email tidak valid.', 422, ['email' => 'Email tidak valid.']);
                }
            }

            if (!is_array($this->findUserByEmail($email))) {
                if (mb_strlen($name) < 2 || mb_strlen($name) > 150) {
                    throw new RegistrationException('Nama harus 2-150 karakter.', 422);
                }
                if (strlen($password) < 8 || strlen($password) > 255) {
                    throw new RegistrationException('Password minimal 8 karakter.', 422);
                }
            }

            $existsStmt = $this->pdo->prepare(
                'SELECT u.id, u.name, u.username, u.email, u.phone_e164, u.email_verified_at, u.status, c.password_hash
                 FROM users u JOIN auth_credentials c ON c.user_id = u.id
                 WHERE u.email = :email LIMIT 1'
            );
            $existsStmt->execute(['email' => $email]);
            $existingUser = $existsStmt->fetch(PDO::FETCH_ASSOC);

            if (is_array($existingUser)) {
                if ($existingUser['status'] !== 'active') {
                    throw new RegistrationException('Akun tidak aktif.', 403);
                }
                $isOwner = $actorUserId !== null && $actorUserId === (int) $existingUser['id'];
                if (!$isOwner && ($loginPassword === null || !password_verify($loginPassword, (string) $existingUser['password_hash']))) {
                    throw new RegistrationException('Password akun Anda salah.', 401, ['password' => 'Password akun Anda salah.', 'login_password' => 'Password akun Anda salah.']);
                }
                $userId = (int) $existingUser['id'];
                // Existing account sudah membuktikan kepemilikan lewat password,
                // jadi generic invite dapat langsung mengaktifkan membership.
                $memberStatus = 'active';
                $this->linkMembership($userId, (int) $invite['pondok_id'], $invite['role'], $memberStatus);
                $this->placeInHalaqah($userId, $invite);
                if ($invite['invited_email'] !== null) {
                    $this->pdo->prepare(
                        'UPDATE pondok_invites SET status = \'accepted\', accepted_by = :user_id, accepted_at = CURRENT_TIMESTAMP(3)
                         WHERE id = :id AND status = \'pending\''
                    )->execute(['user_id' => $userId, 'id' => (int) $invite['id']]);
                }

                if ($ownsTransaction) {
                    $this->pdo->commit();
                }

                return [
                    'user' => [
                        'id' => $userId,
                        'name' => (string) $existingUser['name'],
                        'username' => (string) $existingUser['username'],
                        'email' => $email,
                        'phone_e164' => (string) $existingUser['phone_e164'],
                        'email_verified_at' => $existingUser['email_verified_at'],
                    ],
                    'pondok_id' => (int) $invite['pondok_id'],
                    'role' => $invite['role'],
                    'membership_status' => $memberStatus,
                ];
            }

            $phone = $invite['invited_phone_e164'] !== null
                ? (string) $invite['invited_phone_e164']
                : $this->normalizePhone((string) $phoneInput);
            if ($phone === null) {
                throw new RegistrationException('Nomor WhatsApp wajib diisi.', 422, ['phone' => 'Nomor WhatsApp wajib diisi.']);
            }
            $username = substr($email, 0, (int) strpos($email, '@'));
            $conflict = $this->accounts->findUserConflict($email, $phone, $username);
            if ($conflict !== null && $conflict !== 'username') {
                if ($conflict === 'phone') {
                    throw new RegistrationException('Nomor WhatsApp ini sudah terdaftar. Silakan gunakan nomor lain.', 409);
                }
                throw new RegistrationException('Data ini sudah terdaftar. Silakan login.', 409);
            }
            if ($conflict === 'username') {
                $username = $email;
            }

            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            if ($passwordHash === false) {
                throw new \RuntimeException('Password hashing failed.');
            }

            $globalRole = $invite['role'] === 'musyrif' ? 'musyrif' : 'member';
            $userId = $this->accounts->createUser(
                ['name' => $name, 'username' => $username, 'email' => $email, 'phone' => $phone],
                $passwordHash,
                $globalRole,
            );

            $memberStatus = $invite['invited_email'] === null ? 'invited' : 'active';
                $this->linkMembership($userId, (int) $invite['pondok_id'], $invite['role'], $memberStatus);
            $this->placeInHalaqah($userId, $invite);

            if ($invite['invited_email'] !== null) {
                $this->pdo->prepare(
                    'UPDATE pondok_invites SET status = \'accepted\', accepted_by = :user_id, accepted_at = CURRENT_TIMESTAMP(3)
                     WHERE id = :id AND status = \'pending\''
                )->execute(['user_id' => $userId, 'id' => (int) $invite['id']]);
            }

            if ($ownsTransaction) {
                $this->pdo->commit();
            }

            return [
                'user' => [
                    'id' => $userId,
                    'name' => $name,
                    'username' => $username,
                    'email' => $email,
                    'phone_e164' => $phone,
                    'email_verified_at' => null,
                ],
                'pondok_id' => (int) $invite['pondok_id'],
                'role' => $invite['role'],
                'membership_status' => $memberStatus,
            ];
        } catch (PDOException $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            if ((string) $exception->getCode() === '23000') {
                throw new RegistrationException('Data ini sudah terdaftar. Silakan login.', 409);
            }
            throw $exception;
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    private function linkMembership(int $userId, int $pondokId, string $role, string $status = 'active'): void
    {
        if (!in_array($status, ['active', 'invited'], true)) {
            $status = 'active';
        }
        $globalRole = $role === 'musyrif' ? 'musyrif' : 'member';
        $this->pdo->prepare(
            'INSERT INTO user_roles (user_id, role, status)
             VALUES (:user_id, :role, \'active\')
             ON DUPLICATE KEY UPDATE status = \'active\''
        )->execute(['user_id' => $userId, 'role' => $globalRole]);

        if ($role === 'musyrif' && $status === 'active') {
            $this->pdo->prepare(
                "INSERT INTO musyrif_profiles (user_id, type, pondok_id, status)
                 VALUES (:user_id, 'pondok', :pondok_id, 'active')
                 ON DUPLICATE KEY UPDATE status = 'active'"
            )->execute(['user_id' => $userId, 'pondok_id' => $pondokId]);
        }

        $existing = $this->pdo->prepare(
            'SELECT status FROM pondok_memberships WHERE pondok_id = :pondok_id AND user_id = :user_id LIMIT 1'
        );
        $existing->execute(['pondok_id' => $pondokId, 'user_id' => $userId]);
        $current = $existing->fetchColumn();
        if ($current === 'active') {
            return;
        }
        if ($current !== false) {
            $this->pdo->prepare(
                'UPDATE pondok_memberships SET role = :role, status = :status, joined_at = CURRENT_TIMESTAMP(3)
                 WHERE pondok_id = :pondok_id AND user_id = :user_id'
            )->execute(['role' => $role, 'status' => $status, 'pondok_id' => $pondokId, 'user_id' => $userId]);
            return;
        }
        $this->pdo->prepare(
            "INSERT INTO pondok_memberships (pondok_id, user_id, role, status, joined_at)
             VALUES (:pondok_id, :user_id, :role, :status, CURRENT_TIMESTAMP(3))"
        )->execute(['pondok_id' => $pondokId, 'user_id' => $userId, 'role' => $role, 'status' => $status]);
    }

    /** @return array<string,mixed>|null */
    private function halaqahRow(int $halaqahId, int $pondokId): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT id, name, status, program_start_date
             FROM halaqahs
             WHERE id = :id AND pondok_id = :pondok_id AND deleted_at IS NULL
             LIMIT 1'
        );
        $statement->execute(['id' => $halaqahId, 'pondok_id' => $pondokId]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return is_array($row) ? $row : null;
    }

    /**
     * Pindah halaqah hanya boleh selama program tahfidz di halaqah tersebut
     * belum selesai. Program berjalan 5 pekan x 6 hari = hari ke-30, jatuh pada
     * hari ke-33 kalender sejak tanggal mulai.
     *
     * @param array<string,mixed> $halaqah
     */
    private function assertProgramRunning(array $halaqah, string $position): void
    {
        $start = $halaqah['program_start_date'] !== null ? trim((string) $halaqah['program_start_date']) : '';
        if ($start === '') {
            // Program belum dimulai — belum mungkin dianggap selesai.
            return;
        }

        $tz = new \DateTimeZone('UTC');
        try {
            $startDate = (new \DateTimeImmutable($start, $tz))->setTime(0, 0);
            $today = (new \DateTimeImmutable('now', $tz))->setTime(0, 0);
        } catch (\Exception) {
            return;
        }

        if ($today >= $startDate->modify('+34 days')) {
            throw new RegistrationException(
                'Program tahfidz di halaqah ' . $position . ' "' . (string) $halaqah['name'] . '" sudah selesai. '
                . 'Pindah halaqah hanya bisa dilakukan selama program masih berjalan.',
                422,
                ['halaqah_id' => 'Program halaqah ' . $position . ' sudah selesai.']
            );
        }
    }

    /**
     * Pastikan santri yang mau dipindah masih aktif dan halaqah asalnya masih
     * berjalan programnya. Mengembalikan baris halaqah asal.
     *
     * @param array<string,mixed>|false|null $existing
     * @return array<string,mixed>
     */
    private function assertTransferable(int $pondokId, array|false|null $existing, int $fromHalaqahId, int $toHalaqahId): array
    {
        if (!is_array($existing)) {
            throw new RegistrationException(
                'Santri dengan email ini belum punya akun. Pindah halaqah hanya untuk santri yang sudah terdaftar.',
                422,
                ['email' => 'Santri belum terdaftar.']
            );
        }

        $userId = (int) $existing['id'];
        if (($existing['status'] ?? 'active') !== 'active') {
            throw new RegistrationException('Akun santri tidak aktif, jadi tidak bisa dipindah halaqah.', 422, [
                'halaqah_id' => 'Akun santri tidak aktif.',
            ]);
        }

        $membership = $this->pdo->prepare(
            "SELECT status FROM pondok_memberships WHERE pondok_id = :pondok_id AND user_id = :user_id LIMIT 1"
        );
        $membership->execute(['pondok_id' => $pondokId, 'user_id' => $userId]);
        if ($membership->fetchColumn() !== 'active') {
            throw new RegistrationException('Santri ini belum aktif di pondok, jadi belum bisa dipindah halaqah.', 422, [
                'halaqah_id' => 'Santri belum aktif di pondok.',
            ]);
        }

        if ($fromHalaqahId <= 0) {
            $current = $this->pdo->prepare(
                "SELECT hm.halaqah_id
                 FROM halaqah_memberships hm
                 JOIN halaqahs h ON h.id = hm.halaqah_id AND h.deleted_at IS NULL
                 WHERE hm.user_id = :user_id AND hm.status = 'active' AND h.pondok_id = :pondok_id
                 ORDER BY hm.joined_at DESC, hm.id DESC
                 LIMIT 1"
            );
            $current->execute(['user_id' => $userId, 'pondok_id' => $pondokId]);
            $found = $current->fetchColumn();
            $fromHalaqahId = $found === false ? 0 : (int) $found;
        }

        if ($fromHalaqahId <= 0) {
            throw new RegistrationException('Santri ini belum tergabung di halaqah mana pun.', 422, [
                'from_halaqah_id' => 'Santri belum berada di halaqah mana pun.',
            ]);
        }
        if ($fromHalaqahId === $toHalaqahId) {
            throw new RegistrationException('Santri sudah berada di halaqah tersebut.', 422, [
                'from_halaqah_id' => 'Pilih halaqah tujuan yang berbeda.',
            ]);
        }

        $source = $this->halaqahRow($fromHalaqahId, $pondokId);
        if ($source === null) {
            throw new RegistrationException('Halaqah asal tidak ditemukan di pondok ini.', 422, [
                'from_halaqah_id' => 'Halaqah asal tidak ditemukan.',
            ]);
        }
        if ($source['status'] !== 'active') {
            throw new RegistrationException('Halaqah asal sedang tidak aktif.', 422, [
                'from_halaqah_id' => 'Halaqah asal sedang tidak aktif.',
            ]);
        }

        $activeInSource = $this->pdo->prepare(
            "SELECT 1 FROM halaqah_memberships WHERE halaqah_id = :halaqah_id AND user_id = :user_id AND status = 'active' LIMIT 1"
        );
        $activeInSource->execute(['halaqah_id' => $fromHalaqahId, 'user_id' => $userId]);
        if ($activeInSource->fetchColumn() === false) {
            throw new RegistrationException('Santri bukan anggota aktif halaqah asal.', 422, [
                'from_halaqah_id' => 'Santri bukan anggota halaqah asal.',
            ]);
        }

        $this->assertProgramRunning($source, 'asal');

        return $source;
    }

    /**
     * Tempatkan santri di halaqah tujuan undangan. Untuk undangan pindah,
     * halaqah lama ditutup dan isian progress lama dikosongkan (mulai nol).
     * Dipanggil di dalam transaksi penerimaan undangan.
     *
     * @param array<string,mixed> $invite
     */
    private function placeInHalaqah(int $userId, array $invite): void
    {
        $halaqahId = isset($invite['halaqah_id']) && $invite['halaqah_id'] !== null ? (int) $invite['halaqah_id'] : 0;
        if ($halaqahId <= 0) {
            return;
        }

        $pondokId = (int) $invite['pondok_id'];
        $isTransfer = (int) ($invite['is_transfer'] ?? 0) === 1;

        $target = $this->halaqahRow($halaqahId, $pondokId);
        if ($target === null) {
            throw new RegistrationException('Halaqah tujuan sudah tidak tersedia.', 422);
        }
        if ($target['status'] !== 'active') {
            throw new RegistrationException('Halaqah tujuan sedang tidak aktif.', 422);
        }
        $this->assertProgramRunning($target, 'tujuan');

        $sourceHalaqahId = 0;
        if ($isTransfer) {
            $fromHalaqahId = isset($invite['from_halaqah_id']) && $invite['from_halaqah_id'] !== null
                ? (int) $invite['from_halaqah_id']
                : 0;
            $userRow = $this->pdo->prepare('SELECT id, status FROM users WHERE id = :id LIMIT 1');
            $userRow->execute(['id' => $userId]);
            $user = $userRow->fetch(PDO::FETCH_ASSOC);
            if (!is_array($user)) {
                throw new RegistrationException('Akun santri tidak ditemukan.', 404);
            }
            $source = $this->assertTransferable($pondokId, $user, $fromHalaqahId, $halaqahId);
            $sourceHalaqahId = (int) $source['id'];

            // Isian progress lama dikosongkan: santri mulai nol di halaqah baru.
            $reset = $this->pdo->prepare(
                'DELETE FROM member_progress WHERE user_id = :user_id AND pondok_id = :pondok_id'
            );
            $reset->execute(['user_id' => $userId, 'pondok_id' => $pondokId]);
        }

        // Satu santri satu halaqah: tutup keanggotaan aktif lain di pondok ini.
        $close = $this->pdo->prepare(
            "UPDATE halaqah_memberships hm
             JOIN halaqahs h ON h.id = hm.halaqah_id AND h.deleted_at IS NULL
             SET hm.status = 'left', hm.ended_at = CURRENT_TIMESTAMP(3)
             WHERE hm.user_id = :user_id AND hm.status = 'active'
               AND h.pondok_id = :pondok_id AND hm.halaqah_id <> :halaqah_id"
        );
        $close->execute(['user_id' => $userId, 'pondok_id' => $pondokId, 'halaqah_id' => $halaqahId]);

        // Aktifkan kembali baris keanggotaan lama bila ada, supaya tidak ganda.
        $existing = $this->pdo->prepare(
            'SELECT id FROM halaqah_memberships WHERE halaqah_id = :halaqah_id AND user_id = :user_id LIMIT 1'
        );
        $existing->execute(['halaqah_id' => $halaqahId, 'user_id' => $userId]);
        $membershipId = $existing->fetchColumn();

        if ($membershipId !== false) {
            $this->pdo->prepare(
                "UPDATE halaqah_memberships
                 SET status = 'active', joined_at = CURRENT_TIMESTAMP(3), ended_at = NULL
                 WHERE id = :id"
            )->execute(['id' => (int) $membershipId]);
        } else {
            $this->pdo->prepare(
                "INSERT INTO halaqah_memberships (halaqah_id, user_id, status, joined_at)
                 VALUES (:halaqah_id, :user_id, 'active', CURRENT_TIMESTAMP(3))"
            )->execute(['halaqah_id' => $halaqahId, 'user_id' => $userId]);
        }

        if ($isTransfer) {
            $this->pdo->prepare(
                'INSERT INTO halaqah_transfer_requests
                    (user_id, pondok_id, from_halaqah_id, to_halaqah_id, reason, status, reviewed_by, reviewed_at)
                 VALUES
                    (:user_id, :pondok_id, :from_halaqah_id, :to_halaqah_id,
                     \'Pindah halaqah melalui undangan admin/musyrif.\', \'approved\', :reviewed_by, CURRENT_TIMESTAMP(3))'
            )->execute([
                'user_id' => $userId,
                'pondok_id' => $pondokId,
                'from_halaqah_id' => $sourceHalaqahId > 0 ? $sourceHalaqahId : null,
                'to_halaqah_id' => $halaqahId,
                'reviewed_by' => isset($invite['created_by']) && $invite['created_by'] !== null ? (int) $invite['created_by'] : null,
            ]);
        }
    }

    /** @return array<int,array{id:int,pondok_id:int,pondok_name:string,role:string,expires_at:string}> */
    public function mine(string $email): array
    {
        $statement = $this->pdo->prepare(
            'SELECT i.id, i.pondok_id, p.name AS pondok_name, i.role, i.expires_at
             FROM pondok_invites i
             JOIN pondoks p ON p.id = i.pondok_id
             WHERE i.invited_email = :email AND i.status = \'pending\'
               AND i.expires_at > CURRENT_TIMESTAMP(3)
             ORDER BY i.id DESC LIMIT 20'
        );
        $statement->execute(['email' => strtolower(trim($email))]);
        $rows = $statement->fetchAll(PDO::FETCH_ASSOC);
        return array_map(static fn(array $row) => [
            'id' => (int) $row['id'],
            'pondok_id' => (int) $row['pondok_id'],
            'pondok_name' => (string) $row['pondok_name'],
            'role' => $row['role'],
            'expires_at' => (string) $row['expires_at'],
        ], $rows);
    }

    /**
     * Terima undangan milik sendiri yang sedang login (tanpa token).
     *
     * @return array{user:array{id:int,name:string,username:string,email:string,phone_e164:string,email_verified_at:?string},pondok_id:int,role:string}
     */
    public function acceptById(int $actorUserId, int $inviteId): array
    {
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            $statement = $this->pdo->prepare(
                'SELECT i.id, i.pondok_id, i.role, i.halaqah_id, i.from_halaqah_id, i.is_transfer,
                        i.created_by, i.invited_email, i.status, i.expires_at, u.id AS uid
                 FROM pondok_invites i
                 JOIN users u ON u.email = i.invited_email
                 WHERE i.id = :id AND u.id = :user_id LIMIT 1 FOR UPDATE'
            );
            $statement->execute(['id' => $inviteId, 'user_id' => $actorUserId]);
            $row = $statement->fetch(PDO::FETCH_ASSOC);

            if (!is_array($row) || $row['status'] !== 'pending' || strtotime((string) $row['expires_at']) < time()) {
                throw new RegistrationException('Undangan tidak valid atau sudah kedaluwarsa.', 410);
            }

            $this->linkMembership((int) $row['uid'], (int) $row['pondok_id'], $row['role']);
            $this->placeInHalaqah((int) $row['uid'], $row);
            $this->pdo->prepare(
                'UPDATE pondok_invites SET status = \'accepted\', accepted_by = :user_id, accepted_at = CURRENT_TIMESTAMP(3)
                 WHERE id = :id AND status = \'pending\''
            )->execute(['user_id' => (int) $row['uid'], 'id' => (int) $row['id']]);

            $user = $this->pdo->prepare(
                'SELECT id, name, username, email, phone_e164, email_verified_at FROM users WHERE id = :id'
            );
            $user->execute(['id' => (int) $row['uid']]);
            $userRow = $user->fetch(PDO::FETCH_ASSOC);

            if ($ownsTransaction) {
                $this->pdo->commit();
            }

            return [
                'user' => [
                    'id' => (int) $userRow['id'],
                    'name' => (string) $userRow['name'],
                    'username' => (string) $userRow['username'],
                    'email' => (string) $userRow['email'],
                    'phone_e164' => (string) $userRow['phone_e164'],
                    'email_verified_at' => $userRow['email_verified_at'],
                ],
                'pondok_id' => (int) $row['pondok_id'],
                'role' => $row['role'],
            ];
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    /** @return array<string,mixed>|null */
    private function findUserByEmail(string $email): ?array
    {
        $statement = $this->pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
        $statement->execute(['email' => $email]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : null;
    }

    /** @return array<string,mixed>|null */
    private function findValid(string $token, bool $forUpdate = false): ?array
    {
        $token = trim($token);
        if ($token === '') {
            return null;
        }
        $sql = 'SELECT id, pondok_id, role, halaqah_id, from_halaqah_id, is_transfer, created_by,
                       invited_email, invited_phone_e164, status, expires_at
                FROM pondok_invites WHERE token_hash = :token_hash LIMIT 1';
        if ($forUpdate) {
            $sql .= ' FOR UPDATE';
        }
        $statement = $this->pdo->prepare($sql);
        $statement->execute(['token_hash' => hash('sha256', $token)]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        if (!is_array($row) || $row['status'] !== 'pending') {
            return null;
        }
        if (strtotime((string) $row['expires_at']) < time()) {
            return null;
        }
        return $row;
    }

    private function tryEmail(string $to, string $subject, string $html): bool
    {
        try {
            SmtpMailer::fromConfig()->send($to, $subject, $html);
            return true;
        } catch (\Throwable $exception) {
            error_log('MetodeQu invite email gagal: ' . $exception->getMessage());
            return false;
        }
    }

    private function tryWa(string $phone, string $message, ?int $pondokId = null): bool
    {
        try {
            $result = (new WaSender($this->pdo, WaGateway::fromEnv()))->send([
                'type' => 'invite',
                'phone' => $phone,
                'message' => $message,
                'pondok_id' => $pondokId,
            ]);
            return $result['status'] === 'sent';
        } catch (\Throwable $exception) {
            error_log('MetodeQu invite WA gagal: ' . $exception->getMessage());
            return false;
        }
    }

    private function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }

    private function normalizePhone(string $value): ?string
    {
        $digits = preg_replace('/\D+/', '', trim($value)) ?? '';
        if ($digits === '') {
            return null;
        }
        if (str_starts_with($digits, '0')) {
            $digits = '62' . substr($digits, 1);
        } elseif (str_starts_with($digits, '8')) {
            $digits = '62' . $digits;
        }
        if (!preg_match('/^[1-9][0-9]{7,14}$/', $digits)) {
            return null;
        }
        return '+' . $digits;
    }
}
