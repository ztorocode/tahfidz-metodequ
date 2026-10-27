<?php

declare(strict_types=1);

return [
    'id' => '20261027_016_platform_santri_invites',
    'description' => 'Undangan santri untuk halaqah milik musyrif platform',
    'up' => [
        <<<'SQL'
CREATE TABLE IF NOT EXISTS platform_santri_invites (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    halaqah_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    invite_token_plain VARCHAR(128) NULL,
    invited_email VARCHAR(190) NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    accepted_by BIGINT UNSIGNED NULL,
    status ENUM('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
    expires_at DATETIME(3) NOT NULL,
    accepted_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_platform_santri_invites_token (token_hash),
    KEY idx_platform_santri_invites_scope (halaqah_id, status, expires_at),
    KEY idx_platform_santri_invites_email (invited_email, status),
    CONSTRAINT fk_platform_santri_invites_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id) ON DELETE CASCADE,
    CONSTRAINT fk_platform_santri_invites_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_platform_santri_invites_accepted_by FOREIGN KEY (accepted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    ],
];
