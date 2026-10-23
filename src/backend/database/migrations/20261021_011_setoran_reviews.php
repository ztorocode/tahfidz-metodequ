<?php

declare(strict_types=1);

return [
    'id' => '20261021_011_setoran_reviews',
    'description' => 'Penilaian setoran santri oleh musyrif (riwayat setoran, catatan, ringkasan penguatan)',
    'up' => [
        <<<'SQL'
CREATE TABLE setoran_reviews (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    pondok_id BIGINT UNSIGNED NOT NULL,
    halaqah_id BIGINT UNSIGNED NULL,
    ref VARCHAR(190) NOT NULL,
    page_no SMALLINT UNSIGNED NULL,
    decision ENUM('mutqin','cukup_stabil','penguatan','ulang') NOT NULL DEFAULT 'penguatan',
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    KEY idx_setoran_reviews_student (user_id, pondok_id, created_at),
    KEY idx_setoran_reviews_halaqah (halaqah_id, created_at),
    CONSTRAINT fk_setoran_reviews_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_setoran_reviews_pondok FOREIGN KEY (pondok_id) REFERENCES pondoks (id) ON DELETE CASCADE,
    CONSTRAINT fk_setoran_reviews_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs (id) ON DELETE SET NULL,
    CONSTRAINT fk_setoran_reviews_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    ],
];
