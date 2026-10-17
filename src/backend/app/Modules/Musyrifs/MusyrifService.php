<?php

declare(strict_types=1);

namespace App\Modules\Musyrifs;

use App\Core\PondokDashboard;
use App\Modules\Auth\RegisterRepository;
use App\Modules\Auth\RegistrationException;
use PDO;
use PDOException;

final class MusyrifService
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly RegisterRepository $accounts,
        private readonly MusyrifValidator $validator,
    ) {
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function assertPondokAdmin(array $actor, int $pondokId): void
    {
        try {
            PondokAccess::assertPondokAdmin($this->pdo, $actor, $pondokId);
        } catch (RegistrationException $exception) {
            throw new RegistrationException('Hanya admin pondok yang boleh mengelola musyrif.', 403);
        }
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function addPondokMusyrif(array $actor, array $input): array
    {
        $pondokId = (int) ($input['pondok_id'] ?? 0);
        if ($pondokId <= 0) {
            throw new RegistrationException('Pondok wajib dipilih.', 422, ['pondok_id' => 'Pondok wajib dipilih.']);
        }
        $this->assertPondokAdmin($actor, $pondokId);
        $data = $this->validator->validate($input);

        $pondok = $this->pdo->prepare(
            "SELECT id, name, slug FROM pondoks WHERE id = :id AND status = 'active' LIMIT 1"
        );
        $pondok->execute(['id' => $data['pondok_id']]);
        $pondokRow = $pondok->fetch(PDO::FETCH_ASSOC);
        if (!is_array($pondokRow)) {
            throw new RegistrationException('Pondok tidak ditemukan.', 404);
        }

        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            $conflict = $this->accounts->findUserConflict($data['email'], $data['phone'], $data['username']);
            if ($conflict !== null && $conflict !== 'username') {
                throw $this->conflictException($conflict);
            }
            if ($conflict === 'username') {
                $data['username'] = $data['email'];
            }

            $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);
            if ($passwordHash === false) {
                throw new \RuntimeException('Password hashing failed.');
            }

            $userId = $this->accounts->createUser($data, $passwordHash, 'musyrif');

            $this->pdo->prepare(
                "INSERT INTO musyrif_profiles (user_id, type, pondok_id, status)
                 VALUES (:user_id, 'pondok', :pondok_id, 'active')"
            )->execute(['user_id' => $userId, 'pondok_id' => $data['pondok_id']]);

            $this->pdo->prepare(
                "INSERT INTO pondok_memberships (pondok_id, user_id, role, status, joined_at)
                 VALUES (:pondok_id, :user_id, 'musyrif', 'active', CURRENT_TIMESTAMP(3))"
            )->execute(['pondok_id' => $data['pondok_id'], 'user_id' => $userId]);

            if ($ownsTransaction) {
                $this->pdo->commit();
            }

            PondokDashboard::refreshQuietly($this->pdo, (int) $pondokRow['id']);

            return [
                'id' => $userId,
                'name' => $data['name'],
                'username' => $data['username'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'pondok' => ['id' => (int) $pondokRow['id'], 'name' => $pondokRow['name']],
            ];
        } catch (PDOException $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            if ((string) $exception->getCode() === '23000') {
                throw new RegistrationException('Email, nomor WhatsApp, atau username sudah digunakan.', 409);
            }
            throw $exception;
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function attachExisting(array $actor, int $pondokId, int $userId): array
    {
        $this->assertPondokAdmin($actor, $pondokId);

        $user = $this->pdo->prepare(
            "SELECT id, name, username, email, phone_e164, status FROM users WHERE id = :id LIMIT 1"
        );
        $user->execute(['id' => $userId]);
        $row = $user->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            throw new RegistrationException('User tidak ditemukan.', 404);
        }
        if ($row['status'] !== 'active') {
            throw new RegistrationException('Akun tidak aktif.', 403);
        }

        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            $this->pdo->prepare(
                'INSERT INTO user_roles (user_id, role, status)
                 VALUES (:user_id, \'musyrif\', \'active\')
                 ON DUPLICATE KEY UPDATE status = \'active\''
            )->execute(['user_id' => $userId]);

            $this->pdo->prepare(
                "INSERT INTO musyrif_profiles (user_id, type, pondok_id, status)
                 VALUES (:user_id, 'pondok', :pondok_id, 'active')
                 ON DUPLICATE KEY UPDATE pondok_id = :pondok_id2, status = 'active'"
            )->execute(['user_id' => $userId, 'pondok_id' => $pondokId, 'pondok_id2' => $pondokId]);

            $this->pdo->prepare(
                "INSERT INTO pondok_memberships (pondok_id, user_id, role, status, joined_at)
                 VALUES (:pondok_id, :user_id, 'musyrif', 'active', CURRENT_TIMESTAMP(3))
                 ON DUPLICATE KEY UPDATE role = 'musyrif', status = 'active', joined_at = CURRENT_TIMESTAMP(3)"
            )->execute(['pondok_id' => $pondokId, 'user_id' => $userId]);

            if ($ownsTransaction) {
                $this->pdo->commit();
            }

            PondokDashboard::refreshQuietly($this->pdo, $pondokId);

            return [
                'id' => $userId,
                'name' => $row['name'],
                'email' => $row['email'],
                'phone' => $row['phone_e164'],
            ];
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function listPondokMusyrifs(array $actor, int $pondokId): array
    {
        $this->assertPondokAdmin($actor, $pondokId);

        $statement = $this->pdo->prepare(
            "SELECT u.id, u.name, u.username, u.email, u.phone_e164, u.email_verified_at, u.status,
                    mp.status AS profile_status
             FROM pondok_memberships m
             JOIN users u ON u.id = m.user_id
             LEFT JOIN musyrif_profiles mp ON mp.user_id = u.id
             WHERE m.pondok_id = :pondok_id AND m.role = 'musyrif' AND m.status = 'active'
             ORDER BY u.name"
        );
        $statement->execute(['pondok_id' => $pondokId]);
        $rows = $statement->fetchAll(PDO::FETCH_ASSOC);

        return array_map(static fn(array $row) => [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'username' => $row['username'],
            'email' => $row['email'],
            'phone' => $row['phone_e164'],
            'email_verified' => $row['email_verified_at'] !== null,
            'status' => $row['status'],
            'profile_status' => $row['profile_status'],
        ], $rows);
    }

    private function conflictException(string $field): RegistrationException
    {
        $message = match ($field) {
            'email' => 'Email sudah terdaftar.',
            'phone' => 'Nomor WhatsApp sudah terdaftar.',
            default => 'Akun sudah terdaftar.',
        };
        return new RegistrationException($message, 409, [$field => $message]);
    }
}
