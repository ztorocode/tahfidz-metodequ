<?php

declare(strict_types=1);

return [
    'id' => '20261020_010_pondok_invite_halaqah',
    'description' => 'Undangan santri bisa menyasar halaqah tertentu + penanda pindah halaqah',
    'up' => [
        <<<'SQL'
ALTER TABLE pondok_invites
    ADD COLUMN halaqah_id BIGINT UNSIGNED NULL AFTER role,
    ADD COLUMN from_halaqah_id BIGINT UNSIGNED NULL AFTER halaqah_id,
    ADD COLUMN is_transfer TINYINT(1) NOT NULL DEFAULT 0 AFTER from_halaqah_id,
    ADD KEY idx_pondok_invites_halaqah (pondok_id, halaqah_id, status),
    ADD CONSTRAINT fk_pondok_invites_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs (id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_pondok_invites_from_halaqah FOREIGN KEY (from_halaqah_id) REFERENCES halaqahs (id) ON DELETE SET NULL
SQL,
    ],
];
