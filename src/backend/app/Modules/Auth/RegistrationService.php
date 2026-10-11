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

            if ($conflict !== null) {
                throw $this->conflictException($conflict);
            }

            $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);
            if ($passwordHash === false) {
                throw new \RuntimeException('Password hashing failed.');
            }

            $userId = $this->repository->createUser($data, $passwordHash);

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
