<?php

declare(strict_types=1);

return [
    'id' => '20261017_007_pondok_dashboard',
    'description' => 'Ringkasan dashboard siap pakai per pondok (dihitung ulang dari data mentah)',
    'up' => [
        <<<'SQL'
CREATE TABLE IF NOT EXISTS pondok_dashboard (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    pondok_id BIGINT UNSIGNED NOT NULL,
    halaqah_count INT UNSIGNED NOT NULL DEFAULT 0,
    santri_count INT UNSIGNED NOT NULL DEFAULT 0,
    musyrif_count INT UNSIGNED NOT NULL DEFAULT 0,
    mutqin_total INT UNSIGNED NOT NULL DEFAULT 0,
    pending_total INT UNSIGNED NOT NULL DEFAULT 0,
    distribution JSON NULL,
    last_activity JSON NULL,
    refreshed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_pondok_dashboard_pondok (pondok_id),
    CONSTRAINT fk_pondok_dashboard_pondok FOREIGN KEY (pondok_id) REFERENCES pondoks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    ],
];
