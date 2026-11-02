<?php

declare(strict_types=1);

namespace App\Modules\Platform;

use InvalidArgumentException;
use PDO;

final class PlatformUserService
{
    private const PER_PAGE = 20;
    private const ROLES = ['member', 'musyrif', 'admin', 'super_admin', 'donatur'];
    private const STATUSES = ['active', 'inactive', 'suspended'];

    public function __construct(private readonly PDO $pdo)
    {
    }

    public function index(array $query): array
    {
        $search = trim((string) ($query['q'] ?? ''));
        if (mb_strlen($search) > 100) {
            throw new InvalidArgumentException('Pencarian maksimal 100 karakter.');
        }

        $role = trim((string) ($query['role'] ?? ''));
        $status = trim((string) ($query['status'] ?? ''));
        if ($role !== '' && !in_array($role, self::ROLES, true)) {
            throw new InvalidArgumentException('Filter role tidak valid.');
        }
        if ($status !== '' && !in_array($status, self::STATUSES, true)) {
            throw new InvalidArgumentException('Filter status tidak valid.');
        }

        $page = filter_var($query['page'] ?? 1, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 100000]]);
        if ($page === false) {
            throw new InvalidArgumentException('Nomor halaman tidak valid.');
        }

        $conditions = ['u.deleted_at IS NULL'];
        $args = [];
        if ($search !== '') {
            $pattern = '%' . $search . '%';
            // Search the visible scope as well as identity columns. Pondok scope
            // can come from membership, halaqah, or a pondok musyrif profile.
            $matches = [
                'u.name LIKE ?',
                'u.email LIKE ?',
                'u.phone_e164 LIKE ?',
                "EXISTS (
                    SELECT 1 FROM pondok_memberships pm
                    JOIN pondoks p ON p.id = pm.pondok_id
                    WHERE pm.user_id = u.id AND pm.status = 'active'
                      AND p.status = 'active' AND p.deleted_at IS NULL AND p.name LIKE ?
                )",
                "EXISTS (
                    SELECT 1 FROM halaqah_memberships hm
                    JOIN halaqahs h ON h.id = hm.halaqah_id AND h.deleted_at IS NULL
                    JOIN pondoks p ON p.id = h.pondok_id
                    WHERE hm.user_id = u.id AND hm.status = 'active'
                      AND p.status = 'active' AND p.deleted_at IS NULL AND p.name LIKE ?
                )",
                "EXISTS (
                    SELECT 1 FROM musyrif_profiles mp
                    JOIN pondoks p ON p.id = mp.pondok_id
                    WHERE mp.user_id = u.id AND mp.status = 'active'
                      AND p.status = 'active' AND p.deleted_at IS NULL AND p.name LIKE ?
                )",
            ];
            array_push($args, $pattern, $pattern, $pattern, $pattern, $pattern, $pattern);

            // "Mutqeen" is a displayed scope, not stored in the users table.
            if (mb_stripos('Mutqeen', $search) !== false) {
                $matches[] = "(
                    EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id
                            AND r.role = 'super_admin' AND r.status = 'active')
                    OR EXISTS (SELECT 1 FROM musyrif_profiles mp WHERE mp.user_id = u.id
                               AND mp.type = 'platform' AND mp.status = 'active')
                )";
            }

            $conditions[] = '(' . implode(' OR ', $matches) . ')';
        }
        if ($role !== '') {
            $conditions[] = "EXISTS (SELECT 1 FROM user_roles role_filter WHERE role_filter.user_id = u.id AND role_filter.role = ? AND role_filter.status = 'active')";
            $args[] = $role;
        }
        if ($status !== '') {
            $conditions[] = 'u.status = ?';
            $args[] = $status;
        }
        $where = implode(' AND ', $conditions);

        $countStmt = $this->pdo->prepare('SELECT COUNT(*) FROM users u WHERE ' . $where);
        $countStmt->execute($args);
        $total = (int) $countStmt->fetchColumn();

        $statement = $this->pdo->prepare(
            'SELECT u.id, u.name, u.email, u.phone_e164, u.status, u.created_at
             FROM users u WHERE ' . $where .
            ' ORDER BY u.created_at DESC, u.id DESC LIMIT ? OFFSET ?'
        );
        $position = 1;
        foreach ($args as $arg) {
            $statement->bindValue($position++, $arg, PDO::PARAM_STR);
        }
        $statement->bindValue($position++, self::PER_PAGE, PDO::PARAM_INT);
        $statement->bindValue($position, ((int) $page - 1) * self::PER_PAGE, PDO::PARAM_INT);
        $statement->execute();
        $rows = $statement->fetchAll(PDO::FETCH_ASSOC);

        $items = $this->hydrateUsers($rows);
        return [
            'items' => $items,
            'total' => $total,
            'page' => (int) $page,
            'per_page' => self::PER_PAGE,
            'total_pages' => max(1, (int) ceil($total / self::PER_PAGE)),
            'summary' => $this->summary(),
        ];
    }


    /**
     * Edit identitas, role tambahan, dan status akun. Hanya dipanggil setelah
     * autentikasi super_admin pada controller.
     *
     * @return array{email_changed:bool,email_sent:bool}
     */
    public function update(int $userId, int $actorId, array $input): array
    {
        if ($userId < 1) {
            throw new \App\Modules\Auth\RegistrationException('Pengguna tidak valid.', 422);
        }

        $name = trim((string) ($input['name'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $phone = $this->normalizePhone((string) ($input['phone'] ?? ''));
        $status = (string) ($input['status'] ?? '');
        $roles = $input['roles'] ?? null;

        $errors = [];
        if (mb_strlen($name) < 2 || mb_strlen($name) > 150) {
            $errors['name'] = 'Nama harus 2 sampai 150 karakter.';
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
            $errors['email'] = 'Email tidak valid.';
        }
        if ($phone === null) {
            $errors['phone'] = 'Nomor WhatsApp tidak valid.';
        }
        if (!in_array($status, self::STATUSES, true)) {
            $errors['status'] = 'Status tidak valid.';
        }
        if (!is_array($roles) || $roles === [] || count($roles) > count(self::ROLES)) {
            $errors['roles'] = 'Pilih minimal satu role.';
        } elseif (count(array_filter($roles, 'is_string')) !== count($roles) ||
            count($roles) !== count(array_unique($roles)) ||
            array_diff($roles, self::ROLES) !== []) {
            $errors['roles'] = 'Daftar role tidak valid.';
        }
        if ($errors !== []) {
            throw new \App\Modules\Auth\RegistrationException('Data pengguna belum valid.', 422, $errors);
        }

        $roleNames = array_values($roles);
        $this->pdo->beginTransaction();
        try {
            $rowStmt = $this->pdo->prepare(
                'SELECT id, name, email, phone_e164, status FROM users
                 WHERE id = :id AND deleted_at IS NULL LIMIT 1 FOR UPDATE'
            );
            $rowStmt->execute(['id' => $userId]);
            $existing = $rowStmt->fetch(PDO::FETCH_ASSOC);
            if (!is_array($existing)) {
                throw new \App\Modules\Auth\RegistrationException('Pengguna tidak ditemukan.', 404);
            }

            // Kunci semua baris Super Admin aktif agar dua perubahan paralel
            // tidak dapat sekaligus menghapus admin terakhir.
            $admins = $this->pdo->query(
                "SELECT r.user_id FROM user_roles r JOIN users u ON u.id = r.user_id
                 WHERE r.role = 'super_admin' AND r.status = 'active'
                   AND u.status = 'active' AND u.deleted_at IS NULL
                 ORDER BY r.user_id FOR UPDATE"
            )->fetchAll(PDO::FETCH_COLUMN);
            $roleStmt = $this->pdo->prepare(
                "SELECT role FROM user_roles WHERE user_id = :id AND status = 'active' FOR UPDATE"
            );
            $roleStmt->execute(['id' => $userId]);
            $currentRoles = array_map('strval', $roleStmt->fetchAll(PDO::FETCH_COLUMN));
            $hadSuperAdmin = in_array('super_admin', $currentRoles, true);
            $keepsSuperAdmin = in_array('super_admin', $roleNames, true);
            if ($userId === $actorId && ($status !== 'active' || !$keepsSuperAdmin)) {
                throw new \App\Modules\Auth\RegistrationException(
                    'Tidak dapat menonaktifkan akun sendiri atau melepas role Super Admin sendiri.', 422
                );
            }
            if ($hadSuperAdmin && (!$keepsSuperAdmin || $status !== 'active') &&
                count($admins) <= 1) {
                throw new \App\Modules\Auth\RegistrationException(
                    'Super Admin aktif terakhir tidak boleh dinonaktifkan.', 422
                );
            }

            $emailChanged = strcasecmp((string) $existing['email'], $email) !== 0;
            $phoneChanged = (string) $existing['phone_e164'] !== $phone;
            $rolesChanged = array_diff($currentRoles, $roleNames) !== [] ||
                array_diff($roleNames, $currentRoles) !== [];
            $statusChanged = $status !== (string) $existing['status'];
            $token = null;
            $sql = 'UPDATE users SET name = :name, email = :email, phone_e164 = :phone, status = :status';
            if ($emailChanged) {
                $sql .= ', email_verified_at = NULL';
            }
            if ($phoneChanged) {
                $sql .= ', phone_verified_at = NULL';
            }
            $sql .= ' WHERE id = :id';
            $this->pdo->prepare($sql)->execute([
                'id' => $userId, 'name' => $name, 'email' => $email,
                'phone' => $phone, 'status' => $status,
            ]);

            // Role yang tidak dipilih dinonaktifkan, bukan dihapus.
            $this->pdo->prepare(
                "UPDATE user_roles SET status = 'inactive'
                 WHERE user_id = :id AND status = 'active'"
            )->execute(['id' => $userId]);
            $upsert = $this->pdo->prepare(
                "INSERT INTO user_roles (user_id, role, status)
                 VALUES (:id, :role, 'active')
                 ON DUPLICATE KEY UPDATE status = 'active'"
            );
            foreach ($roleNames as $role) {
                $upsert->execute(['id' => $userId, 'role' => $role]);
            }

            if ($emailChanged) {
                $token = bin2hex(random_bytes(32));
                $expires = (new \DateTimeImmutable('+48 hours'))->format('Y-m-d H:i:s');
                $this->pdo->prepare('DELETE FROM email_verifications WHERE user_id = :id')
                    ->execute(['id' => $userId]);
                $this->pdo->prepare(
                    'INSERT INTO email_verifications (user_id, token_hash, expires_at)
                     VALUES (:id, :hash, :expires)'
                )->execute([
                    'id' => $userId, 'hash' => hash('sha256', $token), 'expires' => $expires,
                ]);
            }

            // Sesi lama tidak boleh hidup kembali saat status dipulihkan.
            // Revoke juga sesi ketika informasi login atau role diubah.
            if ($emailChanged || $phoneChanged || $rolesChanged || $statusChanged) {
                $this->pdo->prepare(
                    'UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP(3)
                     WHERE user_id = :id AND revoked_at IS NULL'
                )->execute(['id' => $userId]);
            }
            $this->pdo->commit();
        } catch (\PDOException $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            if ((string) $e->getCode() === '23000') {
                throw new \App\Modules\Auth\RegistrationException(
                    'Email atau WhatsApp sudah digunakan oleh pengguna lain.', 409
                );
            }
            throw $e;
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }

        $sent = false;
        if ($token !== null) {
            try {
                $sent = (new \App\Modules\Auth\VerificationMailer())
                    ->send($email, $name, $token, false);
            } catch (\Throwable $e) {
                error_log('MetodeQu admin email verification failed: ' . $e->getMessage());
            }
        }
        return [
            'email_changed' => $emailChanged,
            'email_sent' => $sent,
            'session_revoked' => $emailChanged || $phoneChanged || $rolesChanged || $statusChanged,
        ];
    }

    private function normalizePhone(string $value): ?string
    {
        $digits = preg_replace('/\D+/', '', trim($value)) ?? '';
        if ($digits === '') return null;
        if (str_starts_with($digits, '0')) $digits = '62' . substr($digits, 1);
        elseif (str_starts_with($digits, '8')) $digits = '62' . $digits;
        if (!preg_match('/^[1-9][0-9]{7,14}$/', $digits)) return null;
        return '+' . $digits;
    }

    private function hydrateUsers(array $rows): array
    {
        if ($rows === []) {
            return [];
        }

        $ids = array_map(static fn (array $row): int => (int) $row['id'], $rows);
        $placeholder = implode(',', array_fill(0, count($ids), '?'));
        $roles = [];
        $stmt = $this->pdo->prepare(
            "SELECT user_id, role FROM user_roles WHERE user_id IN ($placeholder) AND status = 'active' ORDER BY role"
        );
        $stmt->execute($ids);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $roles[(int) $r['user_id']][] = (string) $r['role'];
        }

        $pondoks = [];
        $stmt = $this->pdo->prepare(
            "SELECT pm.user_id, p.name
             FROM pondok_memberships pm JOIN pondoks p ON p.id = pm.pondok_id
             WHERE pm.user_id IN ($placeholder) AND pm.status = 'active' AND p.status = 'active' AND p.deleted_at IS NULL
             UNION
             SELECT hm.user_id, p.name
             FROM halaqah_memberships hm
             JOIN halaqahs h ON h.id = hm.halaqah_id AND h.deleted_at IS NULL
             JOIN pondoks p ON p.id = h.pondok_id AND p.status = 'active' AND p.deleted_at IS NULL
             WHERE hm.user_id IN ($placeholder) AND hm.status = 'active'
             UNION
             SELECT mp.user_id, p.name
             FROM musyrif_profiles mp
             JOIN pondoks p ON p.id = mp.pondok_id AND p.status = 'active' AND p.deleted_at IS NULL
             WHERE mp.user_id IN ($placeholder) AND mp.status = 'active'"
        );
        $stmt->execute(array_merge($ids, $ids, $ids));
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $pondoks[(int) $r['user_id']][] = (string) $r['name'];
        }

        $platformMusyrifs = [];
        $stmt = $this->pdo->prepare(
            "SELECT DISTINCT user_id FROM musyrif_profiles WHERE user_id IN ($placeholder) AND type = 'platform' AND status = 'active'"
        );
        $stmt->execute($ids);
        foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $id) {
            $platformMusyrifs[(int) $id] = true;
        }

        return array_map(static function (array $row) use ($roles, $pondoks, $platformMusyrifs): array {
            $id = (int) $row['id'];
            $userRoles = $roles[$id] ?? [];
            $userPondoks = array_values(array_unique($pondoks[$id] ?? []));
            $platform = isset($platformMusyrifs[$id]) || in_array('super_admin', $userRoles, true);
            $inPondok = $userPondoks !== [];
            $type = $platform && $inPondok ? 'Platform + Pondok' : ($platform ? 'Platform' : ($inPondok ? 'Pondok' : 'Personal'));

            return [
                'id' => $id,
                'name' => (string) $row['name'],
                'email' => (string) $row['email'],
                'phone' => (string) ($row['phone_e164'] ?? ''),
                'roles' => $userRoles,
                'type' => $type,
                'scope' => $inPondok ? implode(', ', $userPondoks) : ($platform ? 'Mutqeen' : 'Personal'),
                'status' => (string) $row['status'],
                'created_at' => (string) $row['created_at'],
            ];
        }, $rows);
    }

    private function summary(): array
    {
        $stmt = $this->pdo->query(
            "SELECT COUNT(*) AS total,
                SUM(CASE WHEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'member' AND r.status = 'active') THEN 1 ELSE 0 END) AS member,
                SUM(CASE WHEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'musyrif' AND r.status = 'active') THEN 1 ELSE 0 END) AS musyrif,
                SUM(CASE WHEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'admin' AND r.status = 'active') THEN 1 ELSE 0 END) AS admin,
                SUM(CASE WHEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'super_admin' AND r.status = 'active') THEN 1 ELSE 0 END) AS super_admin,
                SUM(CASE WHEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'donatur' AND r.status = 'active') THEN 1 ELSE 0 END) AS donatur
             FROM users u WHERE u.deleted_at IS NULL"
        );
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        $result = [];
        foreach (['total', ...self::ROLES] as $key) {
            $result[$key] = (int) ($row[$key] ?? 0);
        }
        return $result;
    }
}
