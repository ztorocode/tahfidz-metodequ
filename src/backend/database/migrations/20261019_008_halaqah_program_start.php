<?php

declare(strict_types=1);

return [
    'id' => '20261019_008_halaqah_program_start',
    'description' => 'Tanggal mulai program tahfidz per halaqah (menentukan Hari ke-1)',
    'up' => [
        'ALTER TABLE halaqahs ADD COLUMN program_start_date DATE NULL AFTER musyrif_profile_id',
    ],
];
