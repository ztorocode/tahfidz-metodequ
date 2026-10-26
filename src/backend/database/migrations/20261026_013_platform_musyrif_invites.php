<?php

declare(strict_types=1);

return [
    'id' => '20261026_013_platform_musyrif_invites',
    'description' => 'Undangan musyrif platform (di luar konteks pondok)',
    'up' => [
        <<<'SQL'
CREATE TABLE platform_musyrif_invites (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    token_hash CHAR(64) NOT NULL,
    invite_token_plain VARCHAR(128) DEFAULT NULL,
    invited_email VARCHAR(190) DEFAULT NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    accepted_by BIGINT UNSIGNED DEFAULT NULL,
    status ENUM('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
    expires_at DATETIME(3) NOT NULL,
    accepted_at DATETIME(3) DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_platform_musyrif_invites_token (token_hash),
    KEY idx_platform_musyrif_invites_status (status, expires_at),
    KEY idx_platform_musyrif_invites_standing (status, expires_at, invited_email),
    KEY fk_platform_musyrif_invites_created_by (created_by),
    KEY fk_platform_musyrif_invites_accepted_by (accepted_by),
    CONSTRAINT fk_platform_musyrif_invites_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_platform_musyrif_invites_accepted_by FOREIGN KEY (accepted_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    ],
];
