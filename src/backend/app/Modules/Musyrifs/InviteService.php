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

        $errors = [];
        if ($pondokId <= 0) {
            $errors['pondok_id'] = 'Pondok wajib dipilih.';
        }
        if (!in_array($role, ['musyrif', 'santri'], true)) {
            $errors['role'] = 'Role undangan harus musyrif atau santri.';
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

        $existingStmt = $this->pdo->prepare('SELECT id, phone_e164 FROM users WHERE email = :email LIMIT 1');
        $existingStmt->execute(['email' => $email]);
        $existing = $existingStmt->fetch(PDO::FETCH_ASSOC);
        if ($phone === null && is_array($existing)) {
            $phone = (string) $existing['phone_e164'];
        }
        if (is_array($existing)) {
            $already = $this->pdo->prepare(
                "SELECT 1 FROM pondok_memberships
                 WHERE pondok_id = :pondok_id AND user_id = :user_id AND role = :role AND status = 'active' LIMIT 1"
            );
            $already->execute(['pondok_id' => $pondokId, 'user_id' => (int) $existing['id'], 'role' => $role]);
            if ($already->fetchColumn() !== false) {
                throw new RegistrationException('User ini sudah menjadi ' . $role . ' di pondok tersebut.', 409);
            }
        }

        $token = bin2hex(random_bytes(32));
        $this->pdo->prepare(
            'INSERT INTO pondok_invites (pondok_id, role, token_hash, invited_email, invited_phone_e164, created_by, expires_at)
             VALUES (:pondok_id, :role, :token_hash, :email, :phone, :created_by, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 7 DAY))'
        )->execute([
            'pondok_id' => $pondokId,
            'role' => $role,
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
            'Undangan ' . ($role === 'musyrif' ? 'Musyrif' : 'Santri') . ' ' . $safePondok,
            "<p>Halo {$this->e($name)},</p>"
            . "<p>Anda diundang menjadi <strong>" . ($role === 'musyrif' ? 'Musyrif' : 'Santri') . '</strong> di <strong>' . $this->e($safePondok) . '</strong> (MetodeQu).</p>'
            . '<p>Klik link berikut untuk menerima undangan dan membuat password (berlaku 7 hari):</p>'
            . "<p><a href=\"{$link}\">Terima Undangan</a></p>"
            . "<p>Link: {$link}</p>"
        );
        $waSent = $phone !== null ? $this->tryWa(
            $phone,
            "Assalamu'alaikum {$name}, Anda diundang menjadi " . ($role === 'musyrif' ? 'Musyrif' : 'Santri')
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
            throw new RegistrationException('Role undangan harus musyrif atau santri.', 422);
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

    /** @return array{pondok_id:int,pondok_name:string,role:string,email:string,name_hint:string,expires_at:string} */
    public function info(string $token): array
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
        if (!$isGeneric) {
            $registeredStmt = $this->pdo->prepare('SELECT name FROM users WHERE email = :email LIMIT 1');
            $registeredStmt->execute(['email' => $email]);
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
                $memberStatus = $invite['invited_email'] === null ? 'invited' : 'active';
                $this->linkMembership($userId, (int) $invite['pondok_id'], $invite['role'], $memberStatus);
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
                 ON DUPLICATE KEY UPDATE pondok_id = :pondok_id2, status = 'active'"
            )->execute(['user_id' => $userId, 'pondok_id' => $pondokId, 'pondok_id2' => $pondokId]);
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
                'SELECT i.id, i.pondok_id, i.role, i.invited_email, i.status, i.expires_at, u.id AS uid
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
        $sql = 'SELECT id, pondok_id, role, invited_email, invited_phone_e164, status, expires_at
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
