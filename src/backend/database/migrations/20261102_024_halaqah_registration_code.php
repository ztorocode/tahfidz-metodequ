<?php

declare(strict_types=1);

return [
    'id' => '20261102_024_halaqah_registration_code',
    'description' => 'Kode pendaftaran halaqah 6 karakter acak kapital dan angka, unik lintas halaqah',
    'up' => [
        <<<'SQL'
ALTER TABLE halaqahs
  ADD COLUMN registration_code CHAR(6) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD UNIQUE KEY uq_halaqahs_registration_code (registration_code)
SQL,
    ],
];
