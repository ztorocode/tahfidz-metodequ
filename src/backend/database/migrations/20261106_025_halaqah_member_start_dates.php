<?php

declare(strict_types=1);

return [
    'id' => '20261106_025_halaqah_member_start_dates',
    'description' => 'Mode tanggal mulai serempak atau per santri, tanpa mengubah jadwal lama',
    'up' => [
        "ALTER TABLE halaqahs ADD COLUMN start_date_mode ENUM('shared','individual') NOT NULL DEFAULT 'shared' AFTER program_start_date",
        'ALTER TABLE halaqah_memberships ADD COLUMN program_start_date DATE NULL AFTER joined_at',
    ],
];
