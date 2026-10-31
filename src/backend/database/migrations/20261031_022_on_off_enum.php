<?php

declare(strict_types=1);

return [
    'id' => '20261031_022_on_off_enum',
    'description' => 'Normalisasi on_off rekening dan foto menjadi ENUM(on,off)',
    'up' => [
        // Ubah ke teks sementara agar data dari TINYINT (0/1) maupun ENUM (on/off)
        // dapat dinormalisasi tanpa bergantung pada urutan indeks ENUM.
        <<<'SQL'
ALTER TABLE user_meta MODIFY COLUMN on_off VARCHAR(5) NOT NULL DEFAULT 'off'
SQL,
        <<<'SQL'
UPDATE user_meta SET on_off = CASE
    WHEN on_off = '1' THEN 'on'
    WHEN on_off = '0' OR on_off = '' THEN 'off'
    ELSE on_off END
SQL,
        <<<'SQL'
ALTER TABLE user_meta MODIFY COLUMN on_off ENUM('on','off') NOT NULL DEFAULT 'off'
SQL,
        <<<'SQL'
ALTER TABLE halaqah_photos MODIFY COLUMN on_off VARCHAR(5) NOT NULL DEFAULT 'on'
SQL,
        <<<'SQL'
UPDATE halaqah_photos SET on_off = CASE
    WHEN on_off = '1' THEN 'on'
    WHEN on_off = '0' OR on_off = '' THEN 'off'
    ELSE on_off END
SQL,
        <<<'SQL'
ALTER TABLE halaqah_photos MODIFY COLUMN on_off ENUM('on','off') NOT NULL DEFAULT 'on'
SQL,
    ],
];
