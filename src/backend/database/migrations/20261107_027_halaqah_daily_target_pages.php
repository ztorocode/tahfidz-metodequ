<?php

declare(strict_types=1);

return [
    'id' => '20261107_027_halaqah_daily_target_pages',
    'description' => 'Satu target hafalan halaman per halaqah, diatur Ustadz pembimbing',
    'up' => [
        'ALTER TABLE halaqahs ADD COLUMN daily_target_pages DECIMAL(5,2) NULL AFTER start_date_mode',
    ],
];
