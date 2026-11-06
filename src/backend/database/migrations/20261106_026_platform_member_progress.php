<?php
declare(strict_types=1);

return [
    'id' => '20261106_026_platform_member_progress',
    'description' => 'Isian progress santri Halaqah Platform terpisah dari data Pondok',
    'up' => [
        "CREATE TABLE IF NOT EXISTS platform_member_progress (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            halaqah_id BIGINT UNSIGNED NOT NULL,
            week_no TINYINT UNSIGNED NOT NULL,
            day_code ENUM('sabtu','ahad','senin','selasa','rabu','kamis') NOT NULL,
            fields JSON NULL,
            checks JSON NULL,
            completion_percent TINYINT UNSIGNED NOT NULL DEFAULT 0,
            version INT UNSIGNED NOT NULL DEFAULT 1,
            client_updated_at DATETIME(3) DEFAULT NULL,
            created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            deleted_at DATETIME(3) DEFAULT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uq_platform_member_progress_day (user_id,halaqah_id,week_no,day_code),
            KEY idx_platform_member_progress_halaqah (halaqah_id,week_no,day_code),
            CONSTRAINT fk_platform_member_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_platform_member_progress_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id) ON DELETE CASCADE,
            CONSTRAINT chk_platform_member_progress_week CHECK (week_no BETWEEN 1 AND 5),
            CONSTRAINT chk_platform_member_progress_percent CHECK (completion_percent <= 100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ]
];
