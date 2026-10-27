<?php

declare(strict_types=1);

return [
    'id' => '20261027_018_student_activities',
    'description' => 'Event log aktivitas belajar santri untuk dashboard musyrif',
    'up' => [
        <<<'SQL'
CREATE TABLE IF NOT EXISTS student_activities (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    halaqah_id BIGINT UNSIGNED NOT NULL,
    activity_type ENUM(
        'hafalan_kemarin',
        'istima',
        'menghafal',
        'merekam',
        'tikrar'
    ) NOT NULL,
    activity_step TINYINT UNSIGNED NULL,
    week_no TINYINT UNSIGNED NOT NULL,
    day_code ENUM(
        'sabtu',
        'ahad',
        'senin',
        'selasa',
        'rabu',
        'kamis'
    ) NOT NULL,
    event_key VARCHAR(190) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_student_activities_event (event_key),
    KEY idx_student_activities_halaqah_time (halaqah_id, created_at),
    KEY idx_student_activities_user_time (user_id, created_at),
    KEY idx_student_activities_halaqah_user (halaqah_id, user_id),
    CONSTRAINT chk_student_activities_week CHECK (week_no BETWEEN 1 AND 5),
    CONSTRAINT chk_student_activities_step CHECK (
        activity_step IS NULL OR activity_step BETWEEN 1 AND 25
    ),
    CONSTRAINT fk_student_activities_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_student_activities_halaqah
        FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    ],
];
