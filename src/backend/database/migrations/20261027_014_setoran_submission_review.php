<?php

declare(strict_types=1);

return [
    'id' => '20261027_014_setoran_submission_review',
    'description' => 'Penanda setoran rekaman sudah dinilai musyrif (reviewed_by/reviewed_at)',
    'up' => [
        <<<'SQL'
ALTER TABLE setoran_submissions
    ADD COLUMN reviewed_by BIGINT UNSIGNED NULL AFTER status,
    ADD COLUMN reviewed_at DATETIME(3) NULL AFTER reviewed_by,
    ADD KEY idx_setoran_submissions_status (status, created_at),
    ADD CONSTRAINT fk_setoran_submissions_reviewed_by
        FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
SQL,
    ],
];
