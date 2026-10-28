<?php

declare(strict_types=1);

return [
    'id' => '20261028_019_donation_transfers',
    'description' => 'Catatan transfer donasi ustadz, hanya yang terverifikasi dihitung di daftar publik',
    'up' => [
        <<<'SQL'
CREATE TABLE donation_transfers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    musyrif_profile_id BIGINT UNSIGNED NOT NULL,
    amount_idr BIGINT UNSIGNED NOT NULL,
    sent_at DATETIME(3) NOT NULL,
    status ENUM('reported','verified','rejected') NOT NULL DEFAULT 'reported',
    verified_by BIGINT UNSIGNED NULL,
    verified_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_donation_transfers_profile_status_sent (musyrif_profile_id, status, sent_at),
    CONSTRAINT chk_donation_transfers_amount CHECK (amount_idr > 0),
    CONSTRAINT chk_donation_transfers_verified CHECK (status <> 'verified' OR (verified_by IS NOT NULL AND verified_at IS NOT NULL)),
    CONSTRAINT fk_donation_transfers_musyrif FOREIGN KEY (musyrif_profile_id) REFERENCES musyrif_profiles (id) ON DELETE RESTRICT,
    CONSTRAINT fk_donation_transfers_verifier FOREIGN KEY (verified_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    ],
];
