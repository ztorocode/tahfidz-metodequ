<?php

declare(strict_types=1);

return [
    'id' => '20261016_004_standing_invite_token',
    'description' => 'Plain token column for reusable standing pondok invite links',
    'up' => [
        <<<'SQL'
ALTER TABLE pondok_invites ADD COLUMN invite_token_plain VARCHAR(128) NULL AFTER token_hash
SQL,
        <<<'SQL'
ALTER TABLE pondok_invites ADD KEY idx_pondok_invites_standing (pondok_id, role, status, expires_at)
SQL,
    ],
];
