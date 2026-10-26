<?php

declare(strict_types=1);

return [
    'id' => '20261026_012_setoran_submissions',
    'description' => 'Setoran rekaman hafalan santri (audio dikirim ke musyrif)',
    'up' => [
        <<<'SQL'
CREATE TABLE setoran_submissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    pondok_id BIGINT UNSIGNED NOT NULL,
    halaqah_id BIGINT UNSIGNED NULL,
    week_no TINYINT UNSIGNED NOT NULL,
    day_code ENUM('sabtu','ahad','senin','selasa','rabu','kamis') NOT NULL,
    audio_path VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'audio/webm',
    file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('pending','reviewed') NOT NULL DEFAULT 'pending',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    KEY idx_setoran_submissions_student (user_id, pondok_id, created_at),
    KEY idx_setoran_submissions_halaqah (halaqah_id, created_at),
    CONSTRAINT chk_setoran_submissions_week CHECK (week_no BETWEEN 1 AND 5),
    CONSTRAINT fk_setoran_submissions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_setoran_submissions_pondok FOREIGN KEY (pondok_id) REFERENCES pondoks (id) ON DELETE CASCADE,
    CONSTRAINT fk_setoran_submissions_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    ],
];
