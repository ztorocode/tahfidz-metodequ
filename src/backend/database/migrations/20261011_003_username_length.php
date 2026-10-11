<?php

declare(strict_types=1);

return [
    'id' => '20261011_003_username_length',
    'description' => 'Perlebar users.username ke 190 agar bisa menampung email penuh sebagai fallback',
    'up' => [
        <<<'SQL'
ALTER TABLE users MODIFY COLUMN username VARCHAR(190) NOT NULL
SQL,
    ],
];
