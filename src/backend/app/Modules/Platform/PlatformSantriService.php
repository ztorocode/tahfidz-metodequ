<?php

declare(strict_types=1);

namespace App\Modules\Platform;

use App\Core\SmtpMailer;
use App\Modules\Auth\RegisterRepository;
use App\Modules\Auth\RegistrationException;
use PDO;
use PDOException;

final class PlatformSantriService
{
    private const EXPIRY_DAYS = 7;
    private const STANDING_DAYS = 90;

    public function __construct(
        private readonly PDO $pdo,
        private readonly RegisterRepository $accounts,
    ) {
        $this->ensureInviteTable();
    }

    /**
     * Compatibility guard untuk deployment auto-pull yang tidak menjalankan
     * tools/migrate.php. Migration 016 tetap source of truth; DDL ini identik
     * dan idempotent sehingga migration runner bisa dijalankan kemudian.
     */
    private function ensureInviteTable(): void
    {
        $exists = $this->pdo->prepare(
            "SELECT COUNT(*)
             FROM information_schema.tables
             WHERE table_schema = DATABASE()
               AND table_name = 'platform_santri_invites'"
        );
        $exists->execute();

        if ((int) $exists->fetchColumn() > 0) {
            return;
        }

        $this->pdo->exec(
            "CREATE TABLE IF NOT EXISTS platform_santri_invites (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                halaqah_id BIGINT UNSIGNED NOT NULL,
                token_hash CHAR(64) NOT NULL,
                invite_token_plain VARCHAR(128) NULL,
                invited_email VARCHAR(190) NULL,
                created_by BIGINT UNSIGNED NOT NULL,
                accepted_by BIGINT UNSIGNED NULL,
                status ENUM('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
                expires_at DATETIME(3) NOT NULL,
                accepted_at DATETIME(3) NULL,
                created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                PRIMARY KEY (id),
                UNIQUE KEY uq_platform_santri_invites_token (token_hash),
                KEY idx_platform_santri_invites_scope (halaqah_id, status, expires_at),
                KEY idx_platform_santri_invites_email (invited_email, status),
                CONSTRAINT fk_platform_santri_invites_halaqah
                    FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id) ON DELETE CASCADE,
                CONSTRAINT fk_platform_santri_invites_created_by
                    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
                CONSTRAINT fk_platform_santri_invites_accepted_by
                    FOREIGN KEY (accepted_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    }

    /** @param array{id:int,roles:string[]} $actor @return array{id:int,name:string,profile_id:int} */
    private function ownHalaqah(array $actor, int $halaqahId): array
    {
        if ($halaqahId <= 0 || !in_array('musyrif', $actor['roles'] ?? [], true)) {
            throw new RegistrationException('Halaqah tidak ditemukan.', 404);
        }

        $statement = $this->pdo->prepare(
            "SELECT h.id, h.name, h.musyrif_profile_id
             FROM halaqahs h
             JOIN musyrif_profiles mp ON mp.id = h.musyrif_profile_id
             WHERE h.id = :halaqah_id
               AND h.pondok_id IS NULL
               AND h.status = 'active'
               AND h.deleted_at IS NULL
               AND mp.user_id = :user_id
               AND mp.type = 'platform'
               AND mp.status = 'active'
             LIMIT 1"
        );
        $statement->execute([
            'halaqah_id' => $halaqahId,
            'user_id' => (int) $actor['id'],
        ]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            throw new RegistrationException('Anda tidak memiliki akses ke halaqah ini.', 403);
        }

        return [
            'id' => (int) $row['id'],
            'name' => (string) $row['name'],
            'profile_id' => (int) $row['musyrif_profile_id'],
        ];
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function createInvites(array $actor, array $input): array
    {
        $halaqah = $this->ownHalaqah($actor, (int) ($input['halaqah_id'] ?? 0));
        $raw = $input['emails'] ?? [];
        if (!is_array($raw)) {
            $raw = [$raw];
        }

        $emails = [];
        foreach ($raw as $value) {
            foreach (preg_split('/[\s,;]+/', (string) $value) ?: [] as $part) {
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
                $invite = $this->createInvite($actor, $halaqah, $email);
                $sent[] = ['id' => $invite['id'], 'email' => $email, 'email_sent' => $invite['email_sent']];
            } catch (RegistrationException $exception) {
                $failed[] = ['email' => $email, 'message' => $exception->getMessage()];
            }
        }

        return ['sent' => $sent, 'failed' => $failed];
    }

    /** @param array{id:int,roles:string[]} $actor @param array{id:int,name:string,profile_id:int} $halaqah */
    private function createInvite(array $actor, array $halaqah, string $email): array
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
            throw new RegistrationException('Email tidak valid.', 422, ['email' => 'Email tidak valid.']);
        }

        $member = $this->pdo->prepare(
            "SELECT 1
             FROM halaqah_memberships hm
             JOIN users u ON u.id = hm.user_id
             WHERE hm.halaqah_id = :halaqah_id AND hm.status = 'active' AND u.email = :email
             LIMIT 1"
        );
        $member->execute(['halaqah_id' => $halaqah['id'], 'email' => $email]);
        if ($member->fetchColumn() !== false) {
            throw new RegistrationException('Email ini sudah menjadi santri di halaqah tersebut.', 409);
        }

        $pending = $this->pdo->prepare(
            "SELECT id FROM platform_santri_invites
             WHERE halaqah_id = :halaqah_id AND invited_email = :email
               AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP(3)
             LIMIT 1"
        );
        $pending->execute(['halaqah_id' => $halaqah['id'], 'email' => $email]);
        if ($pending->fetchColumn() !== false) {
            throw new RegistrationException('Masih ada undangan pending untuk email ini.', 409);
        }

        $token = bin2hex(random_bytes(32));
        $this->pdo->prepare(
            'INSERT INTO platform_santri_invites
                (halaqah_id, token_hash, invite_token_plain, invited_email, created_by, expires_at)
             VALUES
                (:halaqah_id, :token_hash, :token_plain, :email, :created_by,
                 DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL ' . self::EXPIRY_DAYS . ' DAY))'
        )->execute([
            'halaqah_id' => $halaqah['id'],
            'token_hash' => hash('sha256', $token),
            'token_plain' => $token,
            'email' => $email,
            'created_by' => (int) $actor['id'],
        ]);

        $id = (int) $this->pdo->lastInsertId();
        $link = $this->inviteLink($token);
        $emailSent = $this->tryEmail(
            $email,
            'Undangan Santri MetodeQu',
            '<p>Anda diundang menjadi santri di halaqah <strong>' . $this->e($halaqah['name']) . '</strong> pada MetodeQu.</p>'
            . '<p>Klik link berikut untuk menerima undangan dan membuat akun (berlaku ' . self::EXPIRY_DAYS . ' hari):</p>'
            . '<p><a href="' . $this->e($link) . '">Terima Undangan</a></p>'
            . '<p>Link: ' . $this->e($link) . '</p>'
        );

        return ['id' => $id, 'email' => $email, 'link' => $link, 'email_sent' => $emailSent];
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function standingLink(array $actor, int $halaqahId): array
    {
        $halaqah = $this->ownHalaqah($actor, $halaqahId);

        $statement = $this->pdo->prepare(
            "SELECT id, invite_token_plain
             FROM platform_santri_invites
             WHERE halaqah_id = :halaqah_id
               AND invited_email IS NULL
               AND status = 'pending'
               AND expires_at > CURRENT_TIMESTAMP(3)
             ORDER BY id DESC LIMIT 1"
        );
        $statement->execute(['halaqah_id' => $halaqah['id']]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);
        if (is_array($row) && is_string($row['invite_token_plain']) && $row['invite_token_plain'] !== '') {
            return [
                'id' => (int) $row['id'],
                'link' => $this->inviteLink($row['invite_token_plain']),
                'halaqah' => ['id' => $halaqah['id'], 'name' => $halaqah['name']],
            ];
        }

        $token = bin2hex(random_bytes(32));
        $this->pdo->prepare(
            'INSERT INTO platform_santri_invites
                (halaqah_id, token_hash, invite_token_plain, invited_email, created_by, expires_at)
             VALUES
                (:halaqah_id, :token_hash, :token_plain, NULL, :created_by,
                 DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL ' . self::STANDING_DAYS . ' DAY))'
        )->execute([
            'halaqah_id' => $halaqah['id'],
            'token_hash' => hash('sha256', $token),
            'token_plain' => $token,
            'created_by' => (int) $actor['id'],
        ]);

        return [
            'id' => (int) $this->pdo->lastInsertId(),
            'link' => $this->inviteLink($token),
            'halaqah' => ['id' => $halaqah['id'], 'name' => $halaqah['name']],
        ];
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function addDirect(array $actor, array $input): array
    {
        $halaqah = $this->ownHalaqah($actor, (int) ($input['halaqah_id'] ?? 0));
        $name = trim((string) ($input['name'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $phone = $this->normalizePhone((string) ($input['phone'] ?? ''));
        $password = (string) ($input['password'] ?? '');

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
            throw new RegistrationException('Data santri belum valid.', 422, $errors);
        }

        $username = substr($email, 0, (int) strpos($email, '@'));
        $conflict = $this->accounts->findUserConflict($email, $phone, $username);
        if ($conflict !== null && $conflict !== 'username') {
            throw new RegistrationException(
                $conflict === 'phone' ? 'Nomor WhatsApp sudah terdaftar.' : 'Email sudah terdaftar.',
                409,
                [$conflict => $conflict === 'phone' ? 'Nomor WhatsApp sudah terdaftar.' : 'Email sudah terdaftar.']
            );
        }
        if ($conflict === 'username') {
            $username = $email;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        if ($hash === false) {
            throw new \RuntimeException('Password hashing failed.');
        }

        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            $userId = $this->accounts->createUser([
                'name' => $name,
                'username' => $username,
                'email' => $email,
                'phone' => $phone,
            ], $hash, 'member');

            $this->linkStudent($halaqah['profile_id'], $halaqah['id'], $userId);

            if ($ownsTransaction) {
                $this->pdo->commit();
            }

            return [
                'id' => $userId,
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'halaqah' => ['id' => $halaqah['id'], 'name' => $halaqah['name']],
            ];
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    public function info(string $token): array
    {
        $invite = $this->findValid($token);
        if ($invite === null) {
            throw new RegistrationException('Undangan tidak valid atau sudah kedaluwarsa.', 410);
        }

        $email = $invite['invited_email'] !== null ? (string) $invite['invited_email'] : null;
        $registeredName = null;
        if ($email !== null) {
            $statement = $this->pdo->prepare('SELECT name FROM users WHERE email = :email LIMIT 1');
            $statement->execute(['email' => $email]);
            $value = $statement->fetchColumn();
            $registeredName = is_string($value) ? $value : null;
        }

        return [
            'role' => 'santri',
            'platform_santri' => true,
            'pondok_name' => 'MetodeQu Platform',
            'halaqah_id' => (int) $invite['halaqah_id'],
            'halaqah_name' => (string) $invite['halaqah_name'],
            'registered' => $registeredName !== null,
            'registered_name' => $registeredName,
            'generic' => $email === null,
            'email' => $email,
            'phone' => null,
            'expires_at' => (string) $invite['expires_at'],
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
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
                throw new RegistrationException('Email tidak valid.', 422, ['email' => 'Email tidak valid.']);
            }

            $existing = $this->pdo->prepare(
                'SELECT u.id, u.name, u.username, u.email, u.phone_e164, u.email_verified_at, u.status, c.password_hash
                 FROM users u
                 JOIN auth_credentials c ON c.user_id = u.id
                 WHERE u.email = :email LIMIT 1'
            );
            $existing->execute(['email' => $email]);
            $user = $existing->fetch(PDO::FETCH_ASSOC);

            if (is_array($user)) {
                if ($user['status'] !== 'active') {
                    throw new RegistrationException('Akun tidak aktif.', 403);
                }
                $isOwner = $actorUserId !== null && $actorUserId === (int) $user['id'];
                if (!$isOwner && ($loginPassword === null || !password_verify($loginPassword, (string) $user['password_hash']))) {
                    throw new RegistrationException('Password akun Anda salah.', 401, [
                        'login_password' => 'Password akun Anda salah.',
                    ]);
                }

                $userId = (int) $user['id'];
                $this->ensureMemberRole($userId);
                $this->linkStudent((int) $invite['profile_id'], (int) $invite['halaqah_id'], $userId);
                $this->markAccepted((int) $invite['id'], $userId);

                if ($ownsTransaction) {
                    $this->pdo->commit();
                }

                return ['user' => [
                    'id' => $userId,
                    'name' => (string) $user['name'],
                    'username' => (string) $user['username'],
                    'email' => (string) $user['email'],
                    'phone_e164' => (string) $user['phone_e164'],
                    'email_verified_at' => $user['email_verified_at'],
                ]];
            }

            $name = trim($name);
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
                throw new RegistrationException('Data ini sudah terdaftar. Silakan login.', 409);
            }
            if ($conflict === 'username') {
                $username = $email;
            }

            $hash = password_hash($password, PASSWORD_DEFAULT);
            if ($hash === false) {
                throw new \RuntimeException('Password hashing failed.');
            }

            $userId = $this->accounts->createUser([
                'name' => $name,
                'username' => $username,
                'email' => $email,
                'phone' => $phone,
            ], $hash, 'member');
            $this->pdo->prepare(
                'UPDATE users SET email_verified_at = CURRENT_TIMESTAMP(3) WHERE id = :id'
            )->execute(['id' => $userId]);

            $this->linkStudent((int) $invite['profile_id'], (int) $invite['halaqah_id'], $userId);
            $this->markAccepted((int) $invite['id'], $userId);

            if ($ownsTransaction) {
                $this->pdo->commit();
            }

            return ['user' => [
                'id' => $userId,
                'name' => $name,
                'username' => $username,
                'email' => $email,
                'phone_e164' => $phone,
                'email_verified_at' => (string) $this->pdo->query(
                    'SELECT email_verified_at FROM users WHERE id = ' . $userId
                )->fetchColumn(),
            ]];
        } catch (PDOException $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            if ((string) $exception->getCode() === '23000') {
                throw new RegistrationException('Data ini sudah terdaftar atau sudah menjadi santri halaqah.', 409);
            }
            throw $exception;
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    private function linkStudent(int $profileId, int $halaqahId, int $userId): void
    {
        $other = $this->pdo->prepare(
            "SELECT h.name
             FROM halaqah_memberships hm
             JOIN halaqahs h ON h.id = hm.halaqah_id
             WHERE hm.user_id = :user_id
               AND hm.status = 'active'
               AND h.musyrif_profile_id = :profile_id
               AND h.id <> :halaqah_id
               AND h.deleted_at IS NULL
             LIMIT 1"
        );
        $other->execute([
            'user_id' => $userId,
            'profile_id' => $profileId,
            'halaqah_id' => $halaqahId,
        ]);
        $otherName = $other->fetchColumn();
        if (is_string($otherName) && $otherName !== '') {
            throw new RegistrationException('Santri ini sudah aktif di halaqah ' . $otherName . '.', 409);
        }

        $this->pdo->prepare(
            "INSERT INTO musyrif_mentees (musyrif_profile_id, user_id, status, assigned_at, ended_at)
             VALUES (:profile_id, :user_id, 'active', CURRENT_TIMESTAMP(3), NULL)
             ON DUPLICATE KEY UPDATE status = 'active', assigned_at = CURRENT_TIMESTAMP(3), ended_at = NULL"
        )->execute(['profile_id' => $profileId, 'user_id' => $userId]);

        $existing = $this->pdo->prepare(
            'SELECT id FROM halaqah_memberships WHERE halaqah_id = :halaqah_id AND user_id = :user_id LIMIT 1'
        );
        $existing->execute(['halaqah_id' => $halaqahId, 'user_id' => $userId]);
        $membershipId = $existing->fetchColumn();
        if ($membershipId === false) {
            $this->pdo->prepare(
                "INSERT INTO halaqah_memberships (halaqah_id, user_id, status, joined_at)
                 VALUES (:halaqah_id, :user_id, 'active', CURRENT_TIMESTAMP(3))"
            )->execute(['halaqah_id' => $halaqahId, 'user_id' => $userId]);
        } else {
            $this->pdo->prepare(
                "UPDATE halaqah_memberships
                 SET status = 'active', joined_at = CURRENT_TIMESTAMP(3), ended_at = NULL
                 WHERE id = :id"
            )->execute(['id' => (int) $membershipId]);
        }
    }

    private function ensureMemberRole(int $userId): void
    {
        $role = $this->pdo->prepare(
            "SELECT id, status FROM user_roles WHERE user_id = :user_id AND role = 'member' LIMIT 1"
        );
        $role->execute(['user_id' => $userId]);
        $row = $role->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            $this->pdo->prepare(
                "INSERT INTO user_roles (user_id, role, status) VALUES (:user_id, 'member', 'active')"
            )->execute(['user_id' => $userId]);
        } elseif ($row['status'] !== 'active') {
            $this->pdo->prepare(
                "UPDATE user_roles SET status = 'active' WHERE id = :id"
            )->execute(['id' => (int) $row['id']]);
        }
    }

    private function markAccepted(int $inviteId, int $userId): void
    {
        $this->pdo->prepare(
            "UPDATE platform_santri_invites
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

        $sql = "SELECT i.id, i.halaqah_id, i.invited_email, i.status, i.expires_at,
                       h.name AS halaqah_name, h.musyrif_profile_id AS profile_id
                FROM platform_santri_invites i
                JOIN halaqahs h ON h.id = i.halaqah_id
                JOIN musyrif_profiles mp ON mp.id = h.musyrif_profile_id
                WHERE i.token_hash = :token_hash
                  AND h.pondok_id IS NULL
                  AND h.status = 'active'
                  AND h.deleted_at IS NULL
                  AND mp.type = 'platform'
                  AND mp.status = 'active'
                LIMIT 1";
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

    private function inviteLink(string $token): string
    {
        $baseUrl = rtrim((string) (getenv('APP_URL') ?: ''), '/');
        return $baseUrl . '/#terima-undangan?token=' . urlencode($token) . '&t=platform-santri';
    }

    private function tryEmail(string $to, string $subject, string $html): bool
    {
        try {
            SmtpMailer::fromConfig()->send($to, $subject, $html);
            return true;
        } catch (\Throwable $exception) {
            error_log('MetodeQu platform santri invite email gagal: ' . $exception->getMessage());
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
