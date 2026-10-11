<?php

declare(strict_types=1);

use App\Core\Env;
use App\Core\SmtpMailer;

$root = dirname(__DIR__);
$backendDir = $root . '/src/backend';

require_once $backendDir . '/app/Core/Env.php';
require_once $backendDir . '/app/Core/SmtpMailer.php';

try {
    Env::load($backendDir . '/.env', override: true, required: true);
    SmtpMailer::fromConfig()->authenticateOnly();

    echo 'SMTP_CONNECT=OK' . PHP_EOL;
    echo 'SMTP_TLS=OK' . PHP_EOL;
    echo 'SMTP_AUTH=OK' . PHP_EOL;
    exit(0);
} catch (Throwable $exception) {
    fwrite(STDERR, 'SMTP_TEST=FAIL' . PHP_EOL);
    fwrite(STDERR, 'ERROR=' . $exception->getMessage() . PHP_EOL);
    exit(2);
}
