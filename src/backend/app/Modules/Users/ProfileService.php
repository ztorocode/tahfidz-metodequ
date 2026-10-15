<?php

declare(strict_types=1);

namespace App\Modules\Users;

use App\Modules\Auth\RegistrationException;
use PDO;

final class ProfileService
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function update(int $userId, array $input): array
    {
        $name = trim((string) ($input['name'] ?? ''));
        $phone = $this->normalizePhone((string) ($input['phone'] ?? ''));

        $errors = [];
        if (mb_strlen($name) < 2 || mb_strlen($name) > 150) {
            $errors['name'] = 'Nama harus 2-150 karakter.';
        }
        if ($phone === null) {
            $errors['phone'] = 'Nomor WhatsApp tidak valid.';
        }
        if ($errors !== []) {
            throw new RegistrationException('Profil belum valid.', 422, $errors);
        }

        try {
            $statement = $this->pdo->prepare(
                'UPDATE users SET name = :name, phone_e164 = :phone WHERE id = :id'
            );
            $statement->execute(['name' => $name, 'phone' => $phone, 'id' => $userId]);
        } catch (\PDOException $exception) {
            if ((string) $exception->getCode() === '23000') {
                throw new RegistrationException('Nomor WhatsApp sudah dipakai akun lain.', 409, [
                    'phone' => 'Nomor WhatsApp sudah dipakai akun lain.',
                ]);
            }
            throw $exception;
        }

        $row = $this->pdo->prepare(
            'SELECT id, name, username, email, phone_e164, email_verified_at FROM users WHERE id = :id'
        );
        $row->execute(['id' => $userId]);
        $user = $row->fetch(PDO::FETCH_ASSOC);

        return [
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'username' => $user['username'],
            'email' => $user['email'],
            'phone' => $user['phone_e164'],
            'email_verified' => $user['email_verified_at'] !== null,
        ];
    }

    public function changePassword(int $userId, string $current, string $next): void
    {
        if (strlen($next) < 8 || strlen($next) > 255) {
            throw new RegistrationException('Password baru minimal 8 karakter.', 422, [
                'password' => 'Password baru minimal 8 karakter.',
            ]);
        }

        $statement = $this->pdo->prepare(
            'SELECT password_hash FROM auth_credentials WHERE user_id = :id LIMIT 1'
        );
        $statement->execute(['id' => $userId]);
        $hash = (string) $statement->fetchColumn();

        if ($hash === '' || !password_verify($current, $hash)) {
            throw new RegistrationException('Password lama salah.', 401, [
                'current_password' => 'Password lama salah.',
            ]);
        }

        $newHash = password_hash($next, PASSWORD_DEFAULT);
        if ($newHash === false) {
            throw new \RuntimeException('Password hashing failed.');
        }

        $this->pdo->prepare(
            'UPDATE auth_credentials
             SET password_hash = :hash, password_changed_at = CURRENT_TIMESTAMP(3)
             WHERE user_id = :id'
        )->execute(['hash' => $newHash, 'id' => $userId]);
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
