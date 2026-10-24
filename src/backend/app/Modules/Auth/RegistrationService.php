<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use PDO;
use PDOException;

final class RegistrationService
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly RegisterRepository $repository,
        private readonly RegisterValidator $validator,
    ) {
    }

    public function register(array $input): array
    {
        $data = $this->validator->validate($input);
        $ownsTransaction = !$this->pdo->inTransaction();

        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            $conflict = $this->repository->findUserConflict(
                $data['email'],
                $data['phone'],
                $data['username'],
            );

            if ($conflict !== null && $conflict !== 'username') {
                throw $this->conflictException($conflict);
            }

            if ($conflict === 'username') {
                // Prefix email sudah dipakai user lain: username = email penuh.
                $data['username'] = $data['email'];
                $conflict = $this->repository->findUserConflict(
                    $data['email'],
                    $data['phone'],
                    $data['username'],
                );
                if ($conflict !== null) {
                    throw $this->conflictException($conflict);
                }
            }

            $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);
            if ($passwordHash === false) {
                throw new \RuntimeException('Password hashing failed.');
            }

            $userId = $this->repository->createUser(
                $data,
                $passwordHash,
                $data['mode'] === 'pondok' ? 'admin' : 'member',
            );

            $verifyToken = bin2hex(random_bytes(32));
            $expiresAt = (new \DateTimeImmutable('+48 hours'))->format('Y-m-d H:i:s');
            $this->repository->createEmailVerification($userId, hash('sha256', $verifyToken), $expiresAt);

            $pondok = null;
            if ($data['mode'] === 'pondok') {
                $slug = $this->uniquePondokSlug($data['pondok_name']);
                $pondokId = $this->repository->createPondok(
                    $userId,
                    $data['pondok_name'],
                    $slug,
                    $data['pondok_address'],
                    $data['pondok_phone'],
                );

                $pondok = [
                    'id' => $pondokId,
                    'name' => $data['pondok_name'],
                    'slug' => $slug,
                    'address' => $data['pondok_address'],
                    'phone' => $data['pondok_phone'],
                ];
            }

            if ($ownsTransaction) {
                $this->pdo->commit();
            }

            $emailSent = $this->sendWelcomeEmail($data, $verifyToken, $ownsTransaction);

            return [
                'account_type' => $data['mode'],
                'user' => [
                    'id' => $userId,
                    'name' => $data['name'],
                    'username' => $data['username'],
                    'email' => $data['email'],
                    'phone' => $data['phone'],
                ],
                'pondok' => $pondok,
                'verification' => [
                    'email_sent' => $emailSent,
                    'expires_in_hours' => 48,
                ],
            ];
        } catch (PDOException $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            if ((string) $exception->getCode() === '23000') {
                throw new RegistrationException(
                    'Email, nomor WhatsApp, username, atau data pondok sudah digunakan.',
                    409,
                );
            }

            throw $exception;
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }
    }

    private function sendWelcomeEmail(array $data, string $verifyToken, bool $ownsTransaction): bool
    {
        // Smoke test memakai transaksi luar + email dummy: jangan kirim email asli.
        if (!$ownsTransaction || str_ends_with($data['email'], '@invalid.example')) {
            return false;
        }

        try {
            return (new VerificationMailer())->send(
                (string) $data['email'],
                (string) $data['name'],
                $verifyToken,
                true
            );
        } catch (\Throwable $exception) {
            error_log('MetodeQu welcome email failed: ' . $exception->getMessage());
            return false;
        }
    }

    private function conflictException(string $field): RegistrationException
    {
        $message = match ($field) {
            'email' => 'Email sudah terdaftar.',
            'phone' => 'Nomor WhatsApp sudah terdaftar.',
            'username' => 'Username dari email tersebut sudah digunakan.',
            default => 'Akun sudah terdaftar.',
        };

        return new RegistrationException($message, 409, [$field => $message]);
    }

    private function uniquePondokSlug(string $name): string
    {
        $ascii = function_exists('iconv')
            ? (iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name) ?: $name)
            : $name;

        $base = strtolower(trim((string) preg_replace('/[^a-zA-Z0-9]+/', '-', $ascii), '-'));
        if ($base === '') {
            $base = 'pondok';
        }

        $base = substr($base, 0, 170);
        $candidate = $base;
        $suffix = 2;

        while ($this->repository->pondokSlugExists($candidate)) {
            $candidate = substr($base, 0, 180 - strlen((string) $suffix)) . '-' . $suffix;
            $suffix++;
        }

        return $candidate;
    }
}
