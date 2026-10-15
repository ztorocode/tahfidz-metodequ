<?php

declare(strict_types=1);

namespace App\Modules\Musyrifs;

use App\Modules\Auth\RegistrationException;
use PDO;

final class PondokAccess
{
    public static function assertPondokAdmin(PDO $pdo, array $actor, int $pondokId): void
    {
        if (in_array('super_admin', $actor['roles'] ?? [], true)) {
            return;
        }
        $statement = $pdo->prepare(
            "SELECT 1 FROM pondok_memberships
             WHERE pondok_id = :pondok_id AND user_id = :user_id
               AND role = 'admin' AND status = 'active' LIMIT 1"
        );
        $statement->execute(['pondok_id' => $pondokId, 'user_id' => (int) $actor['id']]);
        if ($statement->fetchColumn() === false) {
            throw new RegistrationException('Hanya admin pondok yang boleh mengelola.', 403);
        }
    }
}
