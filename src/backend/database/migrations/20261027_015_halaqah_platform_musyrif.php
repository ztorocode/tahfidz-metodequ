<?php

declare(strict_types=1);

return [
    'id' => '20261027_015_halaqah_platform_musyrif',
    'description' => 'Musyrif platform dapat membuat halaqah sendiri (maks 5) tanpa pondok: pondok_id halaqahs menjadi nullable',
    'up' => [
        <<<'SQL'
ALTER TABLE halaqahs
    MODIFY pondok_id BIGINT UNSIGNED NULL
SQL,
    ],
];
