<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use PDO;

final class VerificationService
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /**
     * @return array{user_id:int,email:string,name:string}|null null = token invalid/expired/used
     */
    public function verify(string $token): ?array
    {
        $token = trim($token);
        if ($token === '' || strlen($token) > 256) {
            return null;
        }

        $tokenHash = hash('sha256', $token);
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            $statement = $this->pdo->prepare(
                'SELECT ev.user_id, ev.expires_at, ev.verified_at, u.email, u.name, u.email_verified_at
                 FROM email_verifications ev
                 JOIN users u ON u.id = ev.user_id
                 WHERE ev.token_hash = :token_hash
                 LIMIT 1 FOR UPDATE'
            );
            $statement->execute(['token_hash' => $tokenHash]);
            $row = $statement->fetch(PDO::FETCH_ASSOC);

            if (!is_array($row)) {
                if ($ownsTransaction) {
                    $this->pdo->rollBack();
                }
                return null;
            }

            if ($row['verified_at'] !== null || $row['email_verified_at'] !== null) {
                if ($ownsTransaction) {
                    $this->pdo->rollBack();
                }
                return ['user_id' => (int) $row['user_id'], 'email' => (string) $row['email'], 'name' => (string) $row['name'], 'already' => true];
            }

            if (strtotime((string) $row['expires_at']) < time()) {
                if ($ownsTransaction) {
                    $this->pdo->rollBack();
                }
                return null;
            }

            $this->pdo->prepare(
                'UPDATE email_verifications SET verified_at = CURRENT_TIMESTAMP(3) WHERE token_hash = :token_hash'
            )->execute(['token_hash' => $tokenHash]);
            $this->pdo->prepare(
                'UPDATE users SET email_verified_at = CURRENT_TIMESTAMP(3) WHERE id = :id'
            )->execute(['id' => (int) $row['user_id']]);

            if ($ownsTransaction) {
                $this->pdo->commit();
            }

            return ['user_id' => (int) $row['user_id'], 'email' => (string) $row['email'], 'name' => (string) $row['name']];
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }
}
