<?php

declare(strict_types=1);

return [
    'id' => '20261017_005_pondok_wa_device',
    'description' => 'WhatsApp gateway device slot per pondok (bukan device global)',
    'up' => [
        <<<'SQL'
CREATE TABLE IF NOT EXISTS pondok_wa_devices (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    pondok_id BIGINT UNSIGNED NOT NULL,
    device_id VARCHAR(120) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_pondok_wa_device_pondok (pondok_id),
    UNIQUE KEY uq_pondok_wa_device_device (device_id),
    CONSTRAINT fk_pondok_wa_device_pondok FOREIGN KEY (pondok_id) REFERENCES pondoks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    ],
];
