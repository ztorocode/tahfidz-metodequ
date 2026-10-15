<?php

declare(strict_types=1);

namespace App\Modules\Musyrifs;

use App\Core\SmtpMailer;
use App\Core\WaGateway;
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
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $phone = $this->normalizePhone((string) ($input['phone'] ?? ''));

        $errors = [];
        if ($pondokId <= 0) {
            $errors['pondok_id'] = 'Pondok wajib dipilih.';
        }
        if (!in_array($role, ['musyrif', 'santri'], true)) {
            $errors['role'] = 'Role undangan harus musyrif atau santri.';
        }
        if (mb_strlen($name) < 2 || mb_strlen($name) > 150) {
            $errors['name'] = 'Nama harus 2-150 karakter.';
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
            $errors['email'] = 'Email tidak valid.';
        }
        if ($phone === null) {
            $errors['phone'] = 'Nomor WhatsApp tidak valid.';
        }
        if ($errors !== []) {
            throw new RegistrationException('Data undangan belum valid.', 422, $errors);
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

        $conflict = $this->accounts->findUserConflict($email, $phone, substr($email, 0, (int) strpos($email, '@')));
        if ($conflict === 'email' || $conflict === 'phone') {
            throw new RegistrationException(
                $conflict === 'email' ? 'Email sudah terdaftar.' : 'Nomor WhatsApp sudah terdaftar.',
                409,
                [$conflict => 'Sudah terdaftar.']
            );
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
        $waSent = $this->tryWa(
            $phone,
            "Assalamu'alaikum {$name}, Anda diundang menjadi " . ($role === 'musyrif' ? 'Musyrif' : 'Santri')
            . " di {$safePondok} (MetodeQu). Terima di sini (7 hari): {$link}"
        );

        return [
            'id' => $inviteId,
            'pondok' => ['id' => (int) $pondokRow['id'], 'name' => $safePondok],
            'role' => $role,
            'email' => $email,
            'email_sent' => $emailSent,
            'wa_sent' => $waSent,
        ];
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
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function revoke(array $actor, int $inviteId): bool
    {
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

        return [
            'pondok_id' => (int) $row['pondok_id'],
            'pondok_name' => $pondokName,
            'role' => $row['role'],
            'email' => (string) $row['invited_email'],
            'expires_at' => (string) $row['expires_at'],
        ];
    }

    /**
     * @return array{user:array{id:int,name:string,username:string,email:string,phone_e164:string,email_verified_at:?string},pondok_id:int,role:string}
     */
    public function accept(string $token, string $name, string $password): array
    {
        $name = trim($name);
        if (mb_strlen($name) < 2 || mb_strlen($name) > 150) {
            throw new RegistrationException('Nama harus 2-150 karakter.', 422);
        }
        if (strlen($password) < 8 || strlen($password) > 255) {
            throw new RegistrationException('Password minimal 8 karakter.', 422);
        }

        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            $invite = $this->findValid($token, true);
            if ($invite === null) {
                throw new RegistrationException('Undangan tidak valid atau sudah kedaluwarsa.', 410);
            }

            $email = (string) $invite['invited_email'];
            $phone = (string) $invite['invited_phone_e164'];
            $username = substr($email, 0, (int) strpos($email, '@'));
            $conflict = $this->accounts->findUserConflict($email, $phone, $username);
            if ($conflict !== null && $conflict !== 'username') {
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

            if ($invite['role'] === 'musyrif') {
                $this->pdo->prepare(
                    "INSERT INTO musyrif_profiles (user_id, type, pondok_id, status)
                     VALUES (:user_id, 'pondok', :pondok_id, 'active')"
                )->execute(['user_id' => $userId, 'pondok_id' => (int) $invite['pondok_id']]);
            }

            $this->pdo->prepare(
                "INSERT INTO pondok_memberships (pondok_id, user_id, role, status, joined_at)
                 VALUES (:pondok_id, :user_id, :role, 'active', CURRENT_TIMESTAMP(3))"
            )->execute([
                'pondok_id' => (int) $invite['pondok_id'],
                'user_id' => $userId,
                'role' => $invite['role'] === 'musyrif' ? 'musyrif' : 'santri',
            ]);

            $this->pdo->prepare(
                'UPDATE pondok_invites SET status = \'accepted\', accepted_by = :user_id, accepted_at = CURRENT_TIMESTAMP(3)
                 WHERE id = :id AND status = \'pending\''
            )->execute(['user_id' => $userId, 'id' => (int) $invite['id']]);

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

    private function tryWa(string $phone, string $message): bool
    {
        try {
            WaGateway::fromEnv()->sendText($phone, $message);
            return true;
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
