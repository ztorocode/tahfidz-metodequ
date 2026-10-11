<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use PDO;

final class RegisterRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function findUserConflict(string $email, string $phone, string $username): ?string
    {
        $statement = $this->pdo->prepare(
            'SELECT email, phone_e164, username
             FROM users
             WHERE email = :email OR phone_e164 = :phone OR username = :username
             LIMIT 1'
        );
        $statement->execute([
            'email' => $email,
            'phone' => $phone,
            'username' => $username,
        ]);

        $row = $statement->fetch();
        if (!is_array($row)) {
            return null;
        }

        if (strcasecmp((string) $row['email'], $email) === 0) {
            return 'email';
        }

        if ((string) $row['phone_e164'] === $phone) {
            return 'phone';
        }

        return 'username';
    }

    public function createUser(array $data, string $passwordHash): int
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO users (name, username, email, phone_e164, status)
             VALUES (:name, :username, :email, :phone, \'active\')'
        );
        $statement->execute([
            'name' => $data['name'],
            'username' => $data['username'],
            'email' => $data['email'],
            'phone' => $data['phone'],
        ]);

        $userId = (int) $this->pdo->lastInsertId();

        $credential = $this->pdo->prepare(
            'INSERT INTO auth_credentials (user_id, password_hash, password_changed_at)
             VALUES (:user_id, :password_hash, CURRENT_TIMESTAMP(3))'
        );
        $credential->execute([
            'user_id' => $userId,
            'password_hash' => $passwordHash,
        ]);

        $role = $this->pdo->prepare(
            'INSERT INTO user_roles (user_id, role, status)
             VALUES (:user_id, \'member\', \'active\')'
        );
        $role->execute(['user_id' => $userId]);

        return $userId;
    }

    public function pondokSlugExists(string $slug): bool
    {
        $statement = $this->pdo->prepare('SELECT 1 FROM pondoks WHERE slug = :slug LIMIT 1');
        $statement->execute(['slug' => $slug]);

        return $statement->fetchColumn() !== false;
    }

    public function createPondok(
        int $userId,
        string $name,
        string $slug,
        string $address,
        ?string $phone,
    ): int {
        $statement = $this->pdo->prepare(
            'INSERT INTO pondoks (name, slug, address, phone_e164, status, created_by)
             VALUES (:name, :slug, :address, :phone, \'active\', :created_by)'
        );
        $statement->execute([
            'name' => $name,
            'slug' => $slug,
            'address' => $address,
            'phone' => $phone,
            'created_by' => $userId,
        ]);

        $pondokId = (int) $this->pdo->lastInsertId();

        $membership = $this->pdo->prepare(
            'INSERT INTO pondok_memberships
                (pondok_id, user_id, role, status, joined_at)
             VALUES
                (:pondok_id, :user_id, \'admin\', \'active\', CURRENT_TIMESTAMP(3))'
        );
        $membership->execute([
            'pondok_id' => $pondokId,
            'user_id' => $userId,
        ]);

        $adminRole = $this->pdo->prepare(
            'INSERT INTO user_roles (user_id, role, status)
             VALUES (:user_id, \'admin\', \'active\')
             ON DUPLICATE KEY UPDATE status = \'active\''
        );
        $adminRole->execute(['user_id' => $userId]);

        return $pondokId;
    }

    public function createEmailVerification(int $userId, string $tokenHash, string $expiresAt): void
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO email_verifications (user_id, token_hash, expires_at)
             VALUES (:user_id, :token_hash, :expires_at)'
        );
        $statement->execute([
            'user_id' => $userId,
            'token_hash' => $tokenHash,
            'expires_at' => $expiresAt,
        ]);
    }
}
