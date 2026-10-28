<?php

declare(strict_types=1);

return [
    'id' => '20261028_020_ustadz_donation_profile',
    'description' => 'Rekening publik ustadz dan foto aktivitas halaqah yang telah disetujui untuk publikasi',
    'up' => [
        <<<'SQL'
CREATE TABLE ustadz_public_banks (
    musyrif_profile_id BIGINT UNSIGNED NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(35) NOT NULL,
    account_holder VARCHAR(150) NOT NULL,
    is_public TINYINT(1) NOT NULL DEFAULT 0,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (musyrif_profile_id),
    CONSTRAINT fk_ustadz_public_banks_profile FOREIGN KEY (musyrif_profile_id) REFERENCES musyrif_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE ustadz_activity_photos (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    musyrif_profile_id BIGINT UNSIGNED NOT NULL,
    halaqah_id BIGINT UNSIGNED NULL,
    filename VARCHAR(90) NOT NULL,
    caption VARCHAR(180) NOT NULL,
    published TINYINT(1) NOT NULL DEFAULT 1,
    consent_confirmed_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_ustadz_photo_filename (filename),
    KEY idx_ustadz_photo_profile_pub (musyrif_profile_id, published, created_at),
    CONSTRAINT fk_ustadz_photo_profile FOREIGN KEY (musyrif_profile_id) REFERENCES musyrif_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_ustadz_photo_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    ],
];
