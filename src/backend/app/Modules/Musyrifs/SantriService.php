<?php

declare(strict_types=1);

namespace App\Modules\Musyrifs;

use App\Core\PondokDashboard;
use App\Modules\Auth\RegisterRepository;
use App\Modules\Auth\RegistrationException;
use PDO;

final class SantriService
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly RegisterRepository $accounts,
        private readonly SantriValidator $validator,
    ) {
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function assertPondokAdmin(array $actor, int $pondokId): void
    {
        try {
            PondokAccess::assertPondokAdmin($this->pdo, $actor, $pondokId);
        } catch (RegistrationException $exception) {
            throw new RegistrationException('Hanya admin pondok yang boleh mengelola santri.', 403);
        }
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function addPondokSantri(array $actor, array $input): array
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

            $userId = $this->accounts->createUser($data, $passwordHash, 'member');

            $this->pdo->prepare(
                "INSERT INTO pondok_memberships (pondok_id, user_id, role, status, joined_at)
                 VALUES (:pondok_id, :user_id, 'santri', 'active', CURRENT_TIMESTAMP(3))"
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
            default => 'Akun sudah terdaftar.',
        };
        return new RegistrationException($message, 409, [$field => $message]);
    }
}
