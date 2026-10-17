<?php

declare(strict_types=1);

namespace App\Modules\Musyrifs;

use App\Core\PondokDashboard;
use App\Modules\Auth\RegistrationException;
use PDO;

final class PondokMemberService
{
    public function __construct(
        private readonly PDO $pdo,
    ) {
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function listPending(array $actor, int $pondokId, string $role = ''): array
    {
        PondokAccess::assertPondokAdmin($this->pdo, $actor, $pondokId);

        $sql = "SELECT m.id, m.role, m.created_at, u.id AS user_id, u.name, u.email, u.phone_e164
                FROM pondok_memberships m
                JOIN users u ON u.id = m.user_id
                WHERE m.pondok_id = :pondok_id AND m.status = 'invited'";
        $params = ['pondok_id' => $pondokId];
        if (in_array($role, ['musyrif', 'santri'], true)) {
            $sql .= ' AND m.role = :role';
            $params['role'] = $role;
        }
        $sql .= ' ORDER BY m.id DESC LIMIT 50';

        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        return array_map(static fn(array $row) => [
            'id' => (int) $row['id'],
            'user_id' => (int) $row['user_id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'phone' => $row['phone_e164'],
            'role' => $row['role'],
            'requested_at' => (string) $row['created_at'],
        ], $statement->fetchAll(PDO::FETCH_ASSOC));
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function approve(array $actor, int $membershipId): array
    {
        $row = $this->findPending($actor, $membershipId);

        $this->pdo->prepare(
            "UPDATE pondok_memberships SET status = 'active', joined_at = CURRENT_TIMESTAMP(3)
             WHERE id = :id AND status = 'invited'"
        )->execute(['id' => $membershipId]);

        if ($row['role'] === 'musyrif') {
            $this->pdo->prepare(
                "INSERT INTO musyrif_profiles (user_id, type, pondok_id, status)
                 VALUES (:user_id, 'pondok', :pondok_id, 'active')
                 ON DUPLICATE KEY UPDATE pondok_id = :pondok_id2, status = 'active'"
            )->execute([
                'user_id' => (int) $row['user_id'],
                'pondok_id' => (int) $row['pondok_id'],
                'pondok_id2' => (int) $row['pondok_id'],
            ]);
        }

        PondokDashboard::refreshQuietly($this->pdo, (int) $row['pondok_id']);

        return ['id' => $membershipId, 'name' => (string) $row['name']];
    }

    /** @param array{id:int,roles:string[]} $actor */
    public function reject(array $actor, int $membershipId): array
    {
        $row = $this->findPending($actor, $membershipId);

        $this->pdo->prepare(
            "UPDATE pondok_memberships SET status = 'inactive' WHERE id = :id AND status = 'invited'"
        )->execute(['id' => $membershipId]);

        return ['id' => $membershipId, 'name' => (string) $row['name']];
    }

    /** @param array{id:int,roles:string[]} $actor */
    private function findPending(array $actor, int $membershipId): array
    {
        $statement = $this->pdo->prepare(
            "SELECT m.id, m.pondok_id, m.user_id, m.role, u.name
             FROM pondok_memberships m
             JOIN users u ON u.id = m.user_id
             WHERE m.id = :id AND m.status = 'invited' LIMIT 1"
        );
        $statement->execute(['id' => $membershipId]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            throw new RegistrationException('Pengajuan tidak ditemukan.', 404);
        }

        PondokAccess::assertPondokAdmin($this->pdo, $actor, (int) $row['pondok_id']);

        return $row;
    }
}
