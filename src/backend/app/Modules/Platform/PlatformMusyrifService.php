<?php

declare(strict_types=1);

namespace App\Modules\Platform;

use App\Core\SmtpMailer;
use App\Modules\Auth\RegisterRepository;
use App\Modules\Auth\RegistrationException;
use PDO;
use PDOException;

/**
 * Musyrif platform: dikelola super_admin, tidak terikat pondok.
 * Undangan memakai tabel sendiri (platform_musyrif_invites) karena
 * pondok_invites.pondok_id wajib terisi.
 */
final class PlatformMusyrifService
{
    private const EXPIRY_DAYS = 7;
    private const STANDING_DAYS = 90;

    public function __construct(
        private readonly PDO $pdo,
        private readonly RegisterRepository $accounts,
    ) {
    }

    /** @param array{id:int,roles:string[]} $actor */
    private function assertSuperAdmin(array $actor): void
    {
        if (!in_array('super_admin', $actor['roles'], true)) {
            throw new RegistrationException('Hanya super admin yang boleh mengelola musyrif platform.', 403);
        }
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function createMusyrif(array $actor, array $input): array
    {
        $this->assertSuperAdmin($actor);

        $name = trim((string) ($input['name'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $password = (string) ($input['password'] ?? '');
        $phone = $this->normalizePhone((string) ($input['phone'] ?? ''));

        $errors = [];
        if (mb_strlen($name) < 2 || mb_strlen($name) > 150) {
            $errors['name'] = 'Nama harus 2-150 karakter.';
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
            $errors['email'] = 'Email tidak valid.';
        }
        if ($phone === null) {
            $errors['phone'] = 'Nomor WhatsApp tidak valid.';
        }
        if (strlen($password) < 8 || strlen($password) > 255) {
            $errors['password'] = 'Password minimal 8 karakter.';
        }
        if ($errors !== []) {
            throw new RegistrationException('Data musyrif belum valid.', 422, $errors);
        }

        $username = substr($email, 0, (int) strpos($email, '@'));
        $conflict = $this->accounts->findUserConflict($email, $phone, $username);
        if ($conflict !== null && $conflict !== 'username') {
            if ($conflict === 'phone') {
                throw new RegistrationException('Nomor WhatsApp ini sudah terdaftar. Silakan gunakan nomor lain.', 409, [
                    'phone' => 'Nomor WhatsApp ini sudah terdaftar.',
                ]);
            }
            throw new RegistrationException('Email ini sudah terdaftar. Silakan gunakan email lain.', 409, [
                'email' => 'Email ini sudah terdaftar.',
            ]);
        }
        if ($conflict === 'username') {
            $username = $email;
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        if ($passwordHash === false) {
            throw new \RuntimeException('Password hashing failed.');
        }

        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            $userId = $this->accounts->createUser(
                ['name' => $name, 'username' => $username, 'email' => $email, 'phone' => $phone],
                $passwordHash,
                'musyrif',
            );
            $this->insertPlatformProfile($userId, 'active');

            if ($ownsTransaction) {
                $this->pdo->commit();
            }
        } catch (PDOException $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            if ((string) $exception->getCode() === '23000') {
                throw new RegistrationException('Data ini sudah terdaftar. Silakan gunakan email lain.', 409);
            }
            throw $exception;
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }

        return [
            'id' => $userId,
            'name' => $name,
            'username' => $username,
            'email' => $email,
            'phone' => $phone,
            'type' => 'platform',
            'status' => 'active',
        ];
    }

    /**
     * @param array{id:int,roles:string[]} $actor
     * @return array{sent:array<int,array{id:int,email:string}>,failed:array<int,array{email:string,message:string}>}
     */
    public function createInvites(array $actor, array $input): array
    {
        $this->assertSuperAdmin($actor);

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
                $invite = $this->createInvite($actor, $email);
                $sent[] = ['id' => $invite['id'], 'email' => $email];
            } catch (RegistrationException $exception) {
                $failed[] = ['email' => $email, 'message' => $exception->getMessage()];
            }
        }

        return ['sent' => $sent, 'failed' => $failed];
    }

    /** @param array{id:int,roles:string[]} $actor */
    private function createInvite(array $actor, string $email): array
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
            throw new RegistrationException('Email tidak valid.', 422, ['email' => 'Email tidak valid.']);
        }

        $exists = $this->pdo->prepare(
            "SELECT mp.id FROM musyrif_profiles mp
             JOIN users u ON u.id = mp.user_id
             WHERE u.email = :email AND mp.type = 'platform' LIMIT 1"
        );
        $exists->execute(['email' => $email]);
        if ($exists->fetchColumn() !== false) {
            throw new RegistrationException('Email ini sudah menjadi musyrif platform.', 409);
        }

        $pending = $this->pdo->prepare(
            "SELECT id FROM platform_musyrif_invites
              WHERE invited_email = :email AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP(3) LIMIT 1"
        );
        $pending->execute(['email' => $email]);
        if ($pending->fetchColumn() !== false) {
            throw new RegistrationException('Masih ada undangan pending untuk email ini.', 409);
        }

        $token = bin2hex(random_bytes(32));
        $this->pdo->prepare(
            'INSERT INTO platform_musyrif_invites (token_hash, invite_token_plain, invited_email, created_by, expires_at)
             VALUES (:token_hash, :token_plain, :email, :created_by, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL ' . self::EXPIRY_DAYS . ' DAY))'
        )->execute([
            'token_hash' => hash('sha256', $token),
            'token_plain' => $token,
            'email' => $email,
            'created_by' => (int) $actor['id'],
        ]);
        $inviteId = (int) $this->pdo->lastInsertId();

        $baseUrl = rtrim((string) (getenv('APP_URL') ?: ''), '/');
        $link = $baseUrl . '/#terima-undangan?token=' . urlencode($token) . '&t=platform';
        $emailSent = $this->tryEmail(
            $email,
            'Undangan Musyrif Platform MetodeQu',
            "<p>Halo {$this->e($email)},</p>"
            . '<p>Anda diundang menjadi <strong>Musyrif Platform</strong> di <strong>MetodeQu</strong>.</p>'
            . '<p>Klik link berikut untuk menerima undangan dan membuat password (berlaku ' . self::EXPIRY_DAYS . ' hari):</p>'
            . "<p><a href=\"{$link}\">Terima Undangan</a></p>"
            . "<p>Link: {$link}</p>"
        );

        return [
            'id' => $inviteId,
            'link' => $link,
            'email' => $email,
            'email_sent' => $emailSent,
        ];
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function listInvites(array $actor): array
    {
        $this->assertSuperAdmin($actor);

        $rows = $this->pdo->query(
            'SELECT i.id, i.invited_email, i.status, i.expires_at, i.accepted_at, i.created_at, u.name AS accepted_name
               FROM platform_musyrif_invites i
               LEFT JOIN users u ON u.id = i.accepted_by
              ORDER BY i.id DESC
              LIMIT 100'
        )->fetchAll(PDO::FETCH_ASSOC);

        $items = array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'email' => $row['invited_email'] !== null ? (string) $row['invited_email'] : null,
            'generic' => $row['invited_email'] === null,
            'status' => (string) $row['status'],
            'expires_at' => (string) $row['expires_at'],
            'accepted_at' => $row['accepted_at'] !== null ? (string) $row['accepted_at'] : null,
            'accepted_name' => $row['accepted_name'] !== null ? (string) $row['accepted_name'] : null,
            'created_at' => (string) $row['created_at'],
        ], $rows);

        $pending = 0;
        $accepted = 0;
        foreach ($items as $item) {
            if ($item['status'] === 'pending') {
                $pending++;
            } elseif ($item['status'] === 'accepted') {
                $accepted++;
            }
        }

        return ['items' => $items, 'total' => count($items), 'pending' => $pending, 'accepted' => $accepted];
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function revokeInvite(array $actor, int $inviteId): bool
    {
        $this->assertSuperAdmin($actor);

        $statement = $this->pdo->prepare(
            "UPDATE platform_musyrif_invites SET status = 'revoked'
              WHERE id = :id AND status = 'pending'"
        );
        $statement->execute(['id' => $inviteId]);

        return $statement->rowCount() > 0;
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function regenerateInvite(array $actor, int $inviteId): array
    {
        $this->assertSuperAdmin($actor);

        $statement = $this->pdo->prepare(
            'SELECT id, invited_email, status FROM platform_musyrif_invites WHERE id = :id LIMIT 1'
        );
        $statement->execute(['id' => $inviteId]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row) || $row['status'] !== 'pending') {
            throw new RegistrationException('Undangan tidak ditemukan atau sudah tidak berlaku.', 404);
        }

        $token = bin2hex(random_bytes(32));
        $this->pdo->prepare(
            'UPDATE platform_musyrif_invites
                SET token_hash = :token_hash, invite_token_plain = :token_plain,
                    expires_at = DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL ' . self::EXPIRY_DAYS . ' DAY)
              WHERE id = :id AND status = \'pending\''
        )->execute(['token_hash' => hash('sha256', $token), 'token_plain' => $token, 'id' => $inviteId]);

        $expires = (string) $this->pdo->query(
            'SELECT expires_at FROM platform_musyrif_invites WHERE id = ' . (int) $inviteId
        )->fetchColumn();

        $baseUrl = rtrim((string) (getenv('APP_URL') ?: ''), '/');

        return [
            'id' => $inviteId,
            'link' => $baseUrl . '/#terima-undangan?token=' . urlencode($token) . '&t=platform',
            'email' => $row['invited_email'] !== null ? (string) $row['invited_email'] : null,
            'expires_at' => $expires,
        ];
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function standingLink(array $actor): array
    {
        $this->assertSuperAdmin($actor);

        $existing = $this->pdo->prepare(
            "SELECT id, invite_token_plain FROM platform_musyrif_invites
              WHERE status = 'pending' AND invited_email IS NULL AND expires_at > CURRENT_TIMESTAMP(3)
              ORDER BY id DESC LIMIT 1"
        );
        $existing->execute();
        $row = $existing->fetch(PDO::FETCH_ASSOC);

        $baseUrl = rtrim((string) (getenv('APP_URL') ?: ''), '/');

        if (is_array($row) && is_string($row['invite_token_plain']) && $row['invite_token_plain'] !== '') {
            return [
                'id' => (int) $row['id'],
                'link' => $baseUrl . '/#terima-undangan?token=' . urlencode($row['invite_token_plain']) . '&t=platform',
            ];
        }

        $token = bin2hex(random_bytes(32));
        $this->pdo->prepare(
            'INSERT INTO platform_musyrif_invites (token_hash, invite_token_plain, invited_email, created_by, expires_at)
             VALUES (:token_hash, :token_plain, NULL, :created_by, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL ' . self::STANDING_DAYS . ' DAY))'
        )->execute([
            'token_hash' => hash('sha256', $token),
            'token_plain' => $token,
            'created_by' => (int) $actor['id'],
        ]);

        return [
            'id' => (int) $this->pdo->lastInsertId(),
            'link' => $baseUrl . '/#terima-undangan?token=' . urlencode($token) . '&t=platform',
        ];
    }

    public function info(string $token): array
    {
        $row = $this->findValid($token);
        if ($row === null) {
            throw new RegistrationException('Undangan tidak valid atau sudah kedaluwarsa.', 410);
        }

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
            'role' => 'musyrif',
            'platform' => true,
            'pondok_name' => 'MetodeQu',
            'registered' => $registered === true,
            'registered_name' => is_string($registeredName) ? $registeredName : null,
            'generic' => $isGeneric,
            'email' => $email,
            'phone' => null,
            'expires_at' => (string) $row['expires_at'],
            'transfer' => null,
        ];
    }

    public function accept(
        string $token,
        string $name,
        string $password,
        ?string $phoneInput = null,
        ?string $loginPassword = null,
        ?int $actorUserId = null,
        ?string $emailInput = null,
    ): array {
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
                    throw new RegistrationException('Password akun Anda salah.', 401, [
                        'password' => 'Password akun Anda salah.',
                        'login_password' => 'Password akun Anda salah.',
                    ]);
                }

                $userId = (int) $existingUser['id'];
                // Token undangan dikirim ke email tsb, jadi kepemilikan email
                // dianggap terbukti — wajib agar session bisa diterbitkan.
                $verifiedAt = $existingUser['email_verified_at'];
                if ($verifiedAt === null) {
                    $this->pdo->prepare(
                        'UPDATE users SET email_verified_at = CURRENT_TIMESTAMP(3) WHERE id = :id'
                    )->execute(['id' => $userId]);
                    $verifiedAt = (string) $this->pdo->query(
                        'SELECT email_verified_at FROM users WHERE id = ' . $userId
                    )->fetchColumn();
                }
                $this->linkPlatformRole($userId, 'active');
                $this->markAccepted((int) $invite['id'], $userId);

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
                        'email_verified_at' => $verifiedAt,
                    ],
                    'role' => 'musyrif',
                    'membership_status' => 'active',
                    'platform' => true,
                ];
            }

            if (mb_strlen($name) < 2 || mb_strlen($name) > 150) {
                throw new RegistrationException('Nama harus 2-150 karakter.', 422);
            }
            if (strlen($password) < 8 || strlen($password) > 255) {
                throw new RegistrationException('Password minimal 8 karakter.', 422);
            }

            $phone = $this->normalizePhone((string) $phoneInput);
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

            $userId = $this->accounts->createUser(
                ['name' => $name, 'username' => $username, 'email' => $email, 'phone' => $phone],
                $passwordHash,
                'musyrif',
            );
            $this->insertPlatformProfile($userId, 'active');
            $this->markAccepted((int) $invite['id'], $userId);
            $this->pdo->prepare(
                'UPDATE users SET email_verified_at = CURRENT_TIMESTAMP(3) WHERE id = :id'
            )->execute(['id' => $userId]);

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
                    'email_verified_at' => (string) $this->pdo->query(
                        'SELECT email_verified_at FROM users WHERE id = ' . $userId
                    )->fetchColumn(),
                ],
                'role' => 'musyrif',
                'membership_status' => 'active',
                'platform' => true,
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

    private function insertPlatformProfile(int $userId, string $status): void
    {
        $this->pdo->prepare(
            "INSERT INTO musyrif_profiles (user_id, type, pondok_id, status)
             VALUES (:user_id, 'platform', NULL, :status)"
        )->execute(['user_id' => $userId, 'status' => $status]);
    }

    /** Tautkan user existing menjadi musyrif platform (role + profil platform). */
    private function linkPlatformRole(int $userId, string $status): void
    {
        $profile = $this->pdo->prepare('SELECT type FROM musyrif_profiles WHERE user_id = :user_id LIMIT 1');
        $profile->execute(['user_id' => $userId]);
        $type = $profile->fetchColumn();

        if ($type === false) {
            $this->insertPlatformProfile($userId, $status);
        } else {
            // Satu profile row menjadi identity musyrif. Scope pondok tetap
            // berasal dari pondok_memberships, jadi mengaktifkan platform tidak
            // menghapus konteks pondok yang sudah dimiliki.
            $this->pdo->prepare(
                "UPDATE musyrif_profiles
                 SET type = 'platform', pondok_id = NULL, status = :status
                 WHERE user_id = :user_id"
            )->execute(['status' => $status, 'user_id' => $userId]);
        }

        $role = $this->pdo->prepare(
            "SELECT id, status FROM user_roles WHERE user_id = :user_id AND role = 'musyrif' LIMIT 1"
        );
        $role->execute(['user_id' => $userId]);
        $roleRow = $role->fetch(PDO::FETCH_ASSOC);

        if (!is_array($roleRow)) {
            $this->pdo->prepare(
                "INSERT INTO user_roles (user_id, role, status) VALUES (:user_id, 'musyrif', 'active')"
            )->execute(['user_id' => $userId]);
        } elseif ($roleRow['status'] !== 'active') {
            $this->pdo->prepare(
                "UPDATE user_roles SET status = 'active' WHERE id = :id"
            )->execute(['id' => (int) $roleRow['id']]);
        }
    }

    private function markAccepted(int $inviteId, int $userId): void
    {
        // Undangan per-email ditutup; link umum (standing) tetap pending
        // agar bisa dipakai berulang — sama seperti flow pondok.
        $this->pdo->prepare(
            "UPDATE platform_musyrif_invites
                SET status = 'accepted', accepted_by = :user_id, accepted_at = CURRENT_TIMESTAMP(3)
              WHERE id = :id AND status = 'pending' AND invited_email IS NOT NULL"
        )->execute(['user_id' => $userId, 'id' => $inviteId]);
    }

    /** @return array<string,mixed>|null */
    private function findValid(string $token, bool $forUpdate = false): ?array
    {
        $token = trim($token);
        if ($token === '') {
            return null;
        }
        $sql = 'SELECT id, invited_email, status, expires_at
                FROM platform_musyrif_invites WHERE token_hash = :token_hash LIMIT 1';
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
            error_log('MetodeQu platform invite email gagal: ' . $exception->getMessage());
            return false;
        }
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

    private function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
