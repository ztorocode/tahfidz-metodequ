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
            $conditions[] = '(u.name LIKE ? OR u.email LIKE ? OR u.phone_e164 LIKE ?)';
            $pattern = '%' . $search . '%';
            array_push($args, $pattern, $pattern, $pattern);
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
