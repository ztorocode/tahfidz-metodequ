<?php

declare(strict_types=1);

return [
    'id' => '20261017_006_pondok_wa_templates',
    'description' => 'Template pesan WhatsApp yang bisa diedit per pondok',
    'up' => [
        <<<'SQL'
CREATE TABLE IF NOT EXISTS pondok_wa_templates (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    pondok_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(64) NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_pondok_wa_template (pondok_id, code),
    CONSTRAINT fk_pondok_wa_template_pondok FOREIGN KEY (pondok_id) REFERENCES pondoks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    ],
];
