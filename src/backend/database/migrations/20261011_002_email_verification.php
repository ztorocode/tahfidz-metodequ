<?php

declare(strict_types=1);

return [
    'id' => '20261011_002_email_verification',
    'description' => 'Email verification tokens for registration welcome + verify link',
    'up' => [
        <<<'SQL'
CREATE TABLE IF NOT EXISTS email_verifications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    verified_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_email_verifications_token (token_hash),
    KEY idx_email_verifications_user (user_id, verified_at),
    CONSTRAINT fk_email_verifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    ],
];
