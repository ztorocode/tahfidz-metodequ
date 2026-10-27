<?php

declare(strict_types=1);

return [
    'id' => '20261027_017_student_learning_activities',
    'description' => 'Log aktivitas tombol belajar santri untuk feed musyrif',
    'up' => [
        <<<'SQL'
CREATE TABLE IF NOT EXISTS student_learning_activities (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_key VARCHAR(190) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    halaqah_id BIGINT UNSIGNED NOT NULL,
    week_no TINYINT UNSIGNED NOT NULL,
    day_code ENUM('sabtu','ahad','senin','selasa','rabu','kamis') NOT NULL,
    step_id VARCHAR(50) NOT NULL,
    activity_key VARCHAR(50) NOT NULL,
    activity_count SMALLINT UNSIGNED NULL,
    occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_student_learning_activity_event (event_key),
    KEY idx_student_learning_activity_halaqah (halaqah_id, occurred_at),
    KEY idx_student_learning_activity_user (user_id, occurred_at),
    CONSTRAINT fk_student_learning_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_student_learning_activity_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    ],
];
