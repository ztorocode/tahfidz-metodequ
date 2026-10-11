<?php

declare(strict_types=1);

use App\Core\Database;
use App\Modules\Auth\RegisterRepository;
use App\Modules\Auth\RegisterValidator;
use App\Modules\Auth\RegistrationService;

$root = dirname(__DIR__);
$backendDir = $root . '/src/backend';

[$request, $router] = require $backendDir . '/bootstrap.php';

function smokeFail(string $message): never
{
    fwrite(STDERR, 'FAIL: ' . $message . PHP_EOL);
    exit(2);
}

$pdo = Database::connection();
$service = new RegistrationService(
    $pdo,
    new RegisterRepository($pdo),
    new RegisterValidator(),
);

$tables = ['users', 'auth_credentials', 'pondoks', 'pondok_memberships'];
$before = [];
foreach ($tables as $table) {
    $before[$table] = (int) $pdo->query('SELECT COUNT(*) FROM ' . $table)->fetchColumn();
}

$pdo->beginTransaction();

try {
    $personalPassword = 'SmokePersonal8!';
    $personal = $service->register([
        'mode' => 'personal',
        'name' => 'Smoke Personal',
        'email' => 'smoke.personal.register@invalid.example',
        'phone' => '+6281911100001',
        'password' => $personalPassword,
    ]);

    if (($personal['account_type'] ?? null) !== 'personal') {
        smokeFail('Personal account type mismatch.');
    }

    $passwordStatement = $pdo->prepare(
        'SELECT password_hash FROM auth_credentials WHERE user_id = ?'
    );
    $passwordStatement->execute([$personal['user']['id']]);
    $hash = (string) $passwordStatement->fetchColumn();

    if ($hash === '' || !password_verify($personalPassword, $hash)) {
        smokeFail('Personal password hash verification failed.');
    }

    $pondok = $service->register([
        'mode' => 'pondok',
        'name' => 'Smoke Admin Pondok',
        'email' => 'smoke.pondok.register@invalid.example',
        'phone' => '+6281911100002',
        'password' => 'SmokePondok8!',
        'pondok_name' => 'Smoke Pondok Register',
        'pondok_address' => 'Smoke Test Address',
        'pondok_phone' => '+6281911100003',
    ]);

    if (($pondok['account_type'] ?? null) !== 'pondok' || empty($pondok['pondok']['id'])) {
        smokeFail('Pondok registration result mismatch.');
    }

    $membership = $pdo->prepare(
        'SELECT role, status
         FROM pondok_memberships
         WHERE pondok_id = ? AND user_id = ?'
    );
    $membership->execute([
        $pondok['pondok']['id'],
        $pondok['user']['id'],
    ]);
    $membershipRow = $membership->fetch();

    if (
        !is_array($membershipRow)
        || $membershipRow['role'] !== 'admin'
        || $membershipRow['status'] !== 'active'
    ) {
        smokeFail('Admin Pondok membership was not created correctly.');
    }

    echo 'PERSONAL_REGISTER=OK' . PHP_EOL;
    echo 'PASSWORD_HASH=OK' . PHP_EOL;
    echo 'PONDOK_REGISTER=OK' . PHP_EOL;
    echo 'PONDOK_ADMIN_MEMBERSHIP=OK' . PHP_EOL;
} catch (Throwable $exception) {
    smokeFail($exception->getMessage());
} finally {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
}

foreach ($tables as $table) {
    $after = (int) $pdo->query('SELECT COUNT(*) FROM ' . $table)->fetchColumn();

    if ($after !== $before[$table]) {
        smokeFail('Rollback count mismatch for ' . $table . '.');
    }
}

echo 'ROLLBACK=OK' . PHP_EOL;
