<?php

declare(strict_types=1);

return [
    'id' => '20261031_023_donation_transfer_proofs',
    'description' => 'Identitas donatur dan bukti transfer untuk konfirmasi serta verifikasi donasi',
    'up' => [
        <<<'SQL'
ALTER TABLE donation_transfers
  ADD COLUMN donor_user_id BIGINT UNSIGNED NULL AFTER musyrif_profile_id,
  ADD COLUMN proof_filename VARCHAR(90) NULL AFTER amount_idr,
  ADD KEY idx_donation_transfers_donor (donor_user_id, created_at),
  ADD CONSTRAINT fk_donation_transfers_donor
    FOREIGN KEY (donor_user_id) REFERENCES users(id) ON DELETE SET NULL
SQL,
    ],
];
