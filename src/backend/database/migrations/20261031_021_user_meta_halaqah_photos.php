<?php

declare(strict_types=1);

return [
    'id' => '20261031_021_user_meta_halaqah_photos',
    'description' => 'Rekening ustadz dipindah ke user_meta JSON, foto aktivitas ke halaqah_photos',
    'up' => [
        <<<'SQL'
CREATE TABLE IF NOT EXISTS user_meta (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    meta_key VARCHAR(100) NOT NULL,
    meta_value JSON NOT NULL,
    on_off TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_meta_user_key (user_id, meta_key),
    CONSTRAINT fk_user_meta_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS halaqah_photos (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    halaqah_id BIGINT UNSIGNED NOT NULL,
    filename VARCHAR(90) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    on_off TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_halaqah_photos_filename (filename),
    KEY idx_halaqah_photos_user (user_id, created_at),
    KEY idx_halaqah_photos_halaqah (halaqah_id, on_off, created_at),
    CONSTRAINT fk_halaqah_photos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_halaqah_photos_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        // Migrasi 020 tetap utuh karena checksum schema_migrations. Salin data historis, jika ada.
        // INSERT IGNORE membuat langkah ini aman saat tabel tujuan sudah diisi manual.
        <<<'SQL'
INSERT IGNORE INTO user_meta (user_id, meta_key, meta_value, on_off)
SELECT mp.user_id, 'donation_bank',
       JSON_OBJECT(
           'bank_name', b.bank_name,
           'account_number', b.account_number,
           'account_holder', b.account_holder
       ),
       b.is_public
FROM ustadz_public_banks b
JOIN musyrif_profiles mp ON mp.id = b.musyrif_profile_id
SQL,
        <<<'SQL'
INSERT IGNORE INTO halaqah_photos (id, user_id, halaqah_id, filename, created_at, on_off)
SELECT ph.id, mp.user_id, ph.halaqah_id, ph.filename, ph.created_at, ph.published
FROM ustadz_activity_photos ph
JOIN musyrif_profiles mp ON mp.id = ph.musyrif_profile_id
JOIN halaqahs h ON h.id = ph.halaqah_id AND h.musyrif_profile_id = mp.id
WHERE ph.halaqah_id IS NOT NULL
SQL,
    ],
];
