<?php

declare(strict_types=1);

return [
    'driver' => getenv('MAIL_DRIVER') ?: 'smtp',
    'host' => getenv('MAIL_HOST') ?: 'smtp.gmail.com',
    'port' => (int) (getenv('MAIL_PORT') ?: 587),
    'encryption' => getenv('MAIL_ENCRYPTION') ?: 'tls',
    'username' => getenv('MAIL_USERNAME') ?: '',
    'password' => getenv('MAIL_PASSWORD') ?: '',
    'from_address' => getenv('MAIL_FROM_ADDRESS') ?: '',
    'from_name' => getenv('MAIL_FROM_NAME') ?: 'MetodeQu',
    'timeout' => (int) (getenv('MAIL_TIMEOUT') ?: 10),
];
