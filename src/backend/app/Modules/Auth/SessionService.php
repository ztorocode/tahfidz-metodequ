<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use PDO;

final class SessionService
{
    private const SESSION_DAYS = 30;

    // Hash statis agar timing login user-ada vs tidak-ada tidak mudah dibedakan.
    private const DUMMY_HASH = '$2y$10$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukVtz6SzQm';

    public function __construct(
        private readonly PDO $pdo,
        private readonly LoginValidator $validator,
    ) {
    }

    /**
     * @param array{ip?:string,user_agent?:string,device_id?:string} $context
     */
    public function login(array $input, array $context = []): array
    {
        $data = $this->validator->validate($input);
        $identifier = $data['identifier'];

        $user = $this->findUser($identifier);
        $hash = $user !== null ? (string) $user['password_hash'] : self::DUMMY_HASH;

        if ($user === null || !password_verify($data['password'], $hash)) {
            throw new RegistrationException('Email/username dan password tidak cocok.', 401);
        }

        if ($user['status'] !== 'active') {
            throw new RegistrationException('Akun tidak aktif.', 403);
        }

        // Email wajib diverifikasi lebih dulu (akun lama sudah ditandai terverifikasi).
        if (($user['email_verified_at'] ?? null) === null) {
            throw new RegistrationException(
                'Email Anda belum diverifikasi. Buka link verifikasi yang kami kirim ke ' . $user['email']
                    . ' dan WhatsApp Anda, lalu coba masuk lagi. Bisa juga kirim ulang lewat tombol di bawah.',
                403,
                ['email' => 'Email belum diverifikasi.'],
                'email_unverified'
            );
        }

        $token = bin2hex(random_bytes(32));
        $expiresAt = (new \DateTimeImmutable('+' . self::SESSION_DAYS . ' days'))->format('Y-m-d H:i:s');

        $this->insertSession((int) $user['id'], $token, $expiresAt, $context);

        return [
            'token' => $token,
            'token_type' => 'Bearer',
            'expires_at' => $expiresAt,
            'user' => [
                'id' => (int) $user['id'],
                'name' => $user['name'],
                'username' => $user['username'],
                'email' => $user['email'],
                'phone' => $user['phone_e164'],
                'email_verified' => $user['email_verified_at'] !== null,
                'roles' => $this->activeRoles((int) $user['id']),
                'pondoks' => $this->activePondoks((int) $user['id']),
                'musyrif_type' => $this->musyrifType((int) $user['id']),
                'musyrif_contexts' => $this->musyrifContexts((int) $user['id']),
            ],
        ];
    }

    /**
     * Terbitkan sesi untuk user yang sudah terverifikasi lewat jalur lain (OTP).
     *
     * @param array{id:int|string,name:string,username:string,email:string,phone_e164:string,email_verified_at:?string} $user
     * @param array{ip?:string,user_agent?:string,device_id?:string} $context
     */
    public function startSession(array $user, array $context = []): array
    {
        // Sama seperti login email: akun harus sudah verifikasi email.
        if (($user['email_verified_at'] ?? null) === null) {
            throw new RegistrationException(
                'Email Anda belum diverifikasi. Buka link verifikasi yang kami kirim ke ' . $user['email']
                    . ' dan WhatsApp Anda, lalu coba masuk lagi.',
                403,
                ['email' => 'Email belum diverifikasi.'],
                'email_unverified'
            );
        }

        $token = bin2hex(random_bytes(32));
        $expiresAt = (new \DateTimeImmutable('+' . self::SESSION_DAYS . ' days'))->format('Y-m-d H:i:s');

        $this->insertSession((int) $user['id'], $token, $expiresAt, $context);

        return [
            'token' => $token,
            'token_type' => 'Bearer',
            'expires_at' => $expiresAt,
            'user' => [
                'id' => (int) $user['id'],
                'name' => $user['name'],
                'username' => $user['username'],
                'email' => $user['email'],
                'phone' => $user['phone_e164'] ?? $user['phone'] ?? '',
                'email_verified' => ($user['email_verified_at'] ?? null) !== null,
                'roles' => $this->activeRoles((int) $user['id']),
                'pondoks' => $this->activePondoks((int) $user['id']),
                'musyrif_type' => $this->musyrifType((int) $user['id']),
                'musyrif_contexts' => $this->musyrifContexts((int) $user['id']),
            ],
        ];
    }

    /** @param array{ip?:string,user_agent?:string,device_id?:string} $context */
    private function insertSession(int $userId, string $token, string $expiresAt, array $context): void
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO auth_sessions (user_id, refresh_token_hash, device_id, ip_address, user_agent, expires_at)
             VALUES (:user_id, :token_hash, :device_id, :ip_address, :user_agent, :expires_at)'
        );
        $statement->execute([
            'user_id' => $userId,
            'token_hash' => hash('sha256', $token),
            'device_id' => substr((string) ($context['device_id'] ?? ''), 0, 120) ?: null,
            'ip_address' => substr((string) ($context['ip'] ?? ''), 0, 45) ?: null,
            'user_agent' => substr((string) ($context['user_agent'] ?? ''), 0, 500) ?: null,
            'expires_at' => $expiresAt,
        ]);
    }

    /** @return string[] */
    private function activeRoles(int $userId): array
    {
        $statement = $this->pdo->prepare(
            "SELECT role FROM user_roles WHERE user_id = :user_id AND status = 'active'"
        );
        $statement->execute(['user_id' => $userId]);
        return array_values(array_map('strval', $statement->fetchAll(PDO::FETCH_COLUMN)));
    }

    /** @return array<int,array{id:int,name:string,slug:string,role:string}> */
    private function activePondoks(int $userId): array
    {
        // Anggota halaqah otomatis dianggap terkait pondok pemilik halaqahnya,
        // walau tidak punya pondok_memberships sendiri (santri cukup punya halaqah + musyrif).
        $statement = $this->pdo->prepare(
            "SELECT p.id, p.name, p.slug, m.role
             FROM pondok_memberships m
             JOIN pondoks p ON p.id = m.pondok_id
             WHERE m.user_id = :user_id AND m.status = 'active' AND p.status = 'active'
             UNION
             SELECT p.id, p.name, p.slug, 'member' AS role
             FROM halaqah_memberships hm
             JOIN halaqahs h ON h.id = hm.halaqah_id AND h.deleted_at IS NULL
             JOIN pondoks p ON p.id = h.pondok_id
             WHERE hm.user_id = :user_id2 AND hm.status = 'active' AND p.status = 'active'
               AND NOT EXISTS (
                   SELECT 1 FROM pondok_memberships pm
                   WHERE pm.user_id = hm.user_id AND pm.pondok_id = h.pondok_id AND pm.status = 'active'
               )
             ORDER BY name"
        );
        $statement->execute(['user_id' => $userId, 'user_id2' => $userId]);
        return array_map(
            static fn(array $row) => [
                'id' => (int) $row['id'],
                'name' => $row['name'],
                'slug' => $row['slug'],
                'role' => $row['role'],
            ],
            $statement->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    /** @return array<int,array{id:int,name:string,slug:string,role:string}> */
    private function activeMusyrifPondoks(int $userId): array
    {
        $statement = $this->pdo->prepare(
            "SELECT p.id, p.name, p.slug, 'musyrif' AS role
             FROM pondok_memberships m
             JOIN pondoks p ON p.id = m.pondok_id
             WHERE m.user_id = :user_id
               AND m.role = 'musyrif'
               AND m.status = 'active'
               AND p.status = 'active'
             ORDER BY p.name"
        );
        $statement->execute(['user_id' => $userId]);

        return array_map(
            static fn(array $row) => [
                'id' => (int) $row['id'],
                'name' => (string) $row['name'],
                'slug' => (string) $row['slug'],
                'role' => 'musyrif',
            ],
            $statement->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    private function hasPlatformMusyrifProfile(int $userId): bool
    {
        $statement = $this->pdo->prepare(
            "SELECT 1 FROM musyrif_profiles
             WHERE user_id = :user_id AND type = 'platform' AND status = 'active'
             LIMIT 1"
        );
        $statement->execute(['user_id' => $userId]);
        return $statement->fetchColumn() !== false;
    }

    /**
     * Capability konteks musyrif.
     *
     * Platform tersedia bila akun punya profil platform aktif. Untuk akun legacy
     * musyrif tanpa pondok dan tanpa profil platform, platform tetap dianggap
     * tersedia agar perilaku lama tidak putus.
     *
     * @return array{platform:bool,pondoks:array<int,array{id:int,name:string,slug:string,role:string}>}
     */
    private function musyrifContexts(int $userId): array
    {
        if (!in_array('musyrif', $this->activeRoles($userId), true)) {
            return ['platform' => false, 'pondoks' => []];
        }

        $pondoks = $this->activeMusyrifPondoks($userId);
        $platform = $this->hasPlatformMusyrifProfile($userId) || $pondoks === [];

        return ['platform' => $platform, 'pondoks' => $pondoks];
    }

    /** Legacy hint; keputusan UI baru memakai musyrif_contexts. */
    private function musyrifType(int $userId): ?string
    {
        if (!in_array('musyrif', $this->activeRoles($userId), true)) {
            return null;
        }

        $contexts = $this->musyrifContexts($userId);
        $hasPlatform = $contexts['platform'] === true;
        $hasPondok = $contexts['pondoks'] !== [];

        if ($hasPlatform && $hasPondok) {
            return 'dual';
        }
        return $hasPondok ? 'pondok' : 'platform';
    }

    public function userFromToken(string $token): ?array
    {
        $token = trim($token);
        if ($token === '') {
            return null;
        }

        $statement = $this->pdo->prepare(
            'SELECT u.id, u.name, u.username, u.email, u.phone_e164, u.status, u.email_verified_at
             FROM auth_sessions s
             JOIN users u ON u.id = s.user_id
             WHERE s.refresh_token_hash = :token_hash
               AND s.revoked_at IS NULL
               AND s.expires_at > CURRENT_TIMESTAMP(3)
             LIMIT 1'
        );
        $statement->execute(['token_hash' => hash('sha256', $token)]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        if (!is_array($row) || $row['status'] !== 'active') {
            return null;
        }

        return [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'username' => $row['username'],
            'email' => $row['email'],
            'phone' => $row['phone_e164'],
            'email_verified' => $row['email_verified_at'] !== null,
            'roles' => $this->activeRoles((int) $row['id']),
            'pondoks' => $this->activePondoks((int) $row['id']),
            'musyrif_type' => $this->musyrifType((int) $row['id']),
            'musyrif_contexts' => $this->musyrifContexts((int) $row['id']),
        ];
    }

    public function logout(string $token): bool
    {
        $token = trim($token);
        if ($token === '') {
            return false;
        }

        $statement = $this->pdo->prepare(
            'UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP(3)
             WHERE refresh_token_hash = :token_hash AND revoked_at IS NULL'
        );
        $statement->execute(['token_hash' => hash('sha256', $token)]);

        return $statement->rowCount() > 0;
    }

    public static function bearerToken(array $headers): string
    {
        $auth = (string) ($headers['authorization'] ?? '');
        if (str_starts_with(strtolower($auth), 'bearer ')) {
            return trim(substr($auth, 7));
        }
        return '';
    }

    private function findUser(string $identifier): ?array
    {
        if (str_contains($identifier, '@')) {
            $statement = $this->pdo->prepare(
                'SELECT u.id, u.name, u.username, u.email, u.phone_e164, u.status, u.email_verified_at, c.password_hash
                 FROM users u JOIN auth_credentials c ON c.user_id = u.id
                 WHERE u.email = :identifier LIMIT 1'
            );
            $statement->execute(['identifier' => strtolower($identifier)]);
            $row = $statement->fetch(PDO::FETCH_ASSOC);
            return is_array($row) ? $row : null;
        }

        $phone = $this->normalizePhone($identifier);
        if ($phone !== null) {
            $statement = $this->pdo->prepare(
                'SELECT u.id, u.name, u.username, u.email, u.phone_e164, u.status, u.email_verified_at, c.password_hash
                 FROM users u JOIN auth_credentials c ON c.user_id = u.id
                 WHERE u.phone_e164 = :identifier LIMIT 1'
            );
            $statement->execute(['identifier' => $phone]);
            $row = $statement->fetch(PDO::FETCH_ASSOC);
            if (is_array($row)) {
                return $row;
            }
        }

        $statement = $this->pdo->prepare(
            'SELECT u.id, u.name, u.username, u.email, u.phone_e164, u.status, u.email_verified_at, c.password_hash
             FROM users u JOIN auth_credentials c ON c.user_id = u.id
             WHERE u.username = :identifier LIMIT 1'
        );
        $statement->execute(['identifier' => $identifier]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : null;
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
