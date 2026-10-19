<?php

declare(strict_types=1);

return [
    'id' => '20261019_009_member_progress',
    'description' => 'Isian progress harian santri (tersinkron dari perangkat, siap offline)',
    'up' => [
        <<<'SQL'
CREATE TABLE IF NOT EXISTS member_progress (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    pondok_id BIGINT UNSIGNED NOT NULL,
    halaqah_id BIGINT UNSIGNED NULL,
    week_no TINYINT UNSIGNED NOT NULL,
    day_code ENUM('sabtu','ahad','senin','selasa','rabu','kamis') NOT NULL,
    fields JSON NULL,
    checks JSON NULL,
    completion_percent TINYINT UNSIGNED NOT NULL DEFAULT 0,
    version INT UNSIGNED NOT NULL DEFAULT 1,
    client_updated_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_member_progress_day (user_id, pondok_id, week_no, day_code),
    KEY idx_member_progress_scope (pondok_id, halaqah_id, week_no, day_code),
    KEY idx_member_progress_user (user_id, pondok_id, week_no),
    CONSTRAINT chk_member_progress_week CHECK (week_no BETWEEN 1 AND 5),
    CONSTRAINT chk_member_progress_percent CHECK (completion_percent <= 100),
    CONSTRAINT fk_member_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_member_progress_pondok FOREIGN KEY (pondok_id) REFERENCES pondoks(id) ON DELETE CASCADE,
    CONSTRAINT fk_member_progress_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    ],
];
