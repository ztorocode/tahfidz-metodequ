<?php

declare(strict_types=1);

return [
    'id' => '20261010_001_initial_schema',
    'description' => 'Initial MetodeQu schema for auth, tenant, tahfidz, sync, options, and audit',
    'up' => [
        <<<'SQL'
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(190) NOT NULL,
    phone_e164 VARCHAR(30) NOT NULL,
    email_verified_at DATETIME(3) NULL,
    phone_verified_at DATETIME(3) NULL,
    status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_phone (phone_e164),
    KEY idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS user_roles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    role VARCHAR(50) NOT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_roles_user_role (user_id, role),
    KEY idx_user_roles_role_status (role, status),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS auth_credentials (
    user_id BIGINT UNSIGNED NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_changed_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (user_id),
    CONSTRAINT fk_auth_credentials_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS auth_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    refresh_token_hash CHAR(64) NOT NULL,
    device_id VARCHAR(120) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    expires_at DATETIME(3) NOT NULL,
    revoked_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_auth_sessions_token (refresh_token_hash),
    KEY idx_auth_sessions_user_active (user_id, revoked_at, expires_at),
    CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS otp_challenges (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NULL,
    phone_e164 VARCHAR(30) NOT NULL,
    purpose ENUM('login','register','verify_phone','reset_password') NOT NULL DEFAULT 'login',
    otp_hash VARCHAR(255) NOT NULL,
    attempt_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    expires_at DATETIME(3) NOT NULL,
    verified_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_otp_phone_purpose (phone_e164, purpose, expires_at),
    KEY idx_otp_user (user_id),
    CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS pondoks (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(190) NOT NULL,
    slug VARCHAR(190) NOT NULL,
    address TEXT NULL,
    phone_e164 VARCHAR(30) NULL,
    status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_pondoks_slug (slug),
    KEY idx_pondoks_status (status),
    CONSTRAINT fk_pondoks_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS pondok_memberships (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    pondok_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    role ENUM('admin','musyrif','santri') NOT NULL,
    status ENUM('invited','active','inactive','left') NOT NULL DEFAULT 'active',
    joined_at DATETIME(3) NULL,
    ended_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_pondok_membership (pondok_id, user_id),
    KEY idx_pondok_memberships_user (user_id, status),
    KEY idx_pondok_memberships_role (pondok_id, role, status),
    CONSTRAINT fk_pondok_memberships_pondok FOREIGN KEY (pondok_id) REFERENCES pondoks(id) ON DELETE CASCADE,
    CONSTRAINT fk_pondok_memberships_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS pondok_invites (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    pondok_id BIGINT UNSIGNED NOT NULL,
    role ENUM('admin','musyrif','santri') NOT NULL,
    token_hash CHAR(64) NOT NULL,
    invited_email VARCHAR(190) NULL,
    invited_phone_e164 VARCHAR(30) NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    accepted_by BIGINT UNSIGNED NULL,
    status ENUM('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
    expires_at DATETIME(3) NOT NULL,
    accepted_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_pondok_invites_token (token_hash),
    KEY idx_pondok_invites_scope (pondok_id, role, status, expires_at),
    CONSTRAINT fk_pondok_invites_pondok FOREIGN KEY (pondok_id) REFERENCES pondoks(id) ON DELETE CASCADE,
    CONSTRAINT fk_pondok_invites_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pondok_invites_accepted_by FOREIGN KEY (accepted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS musyrif_profiles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    type ENUM('platform','pondok') NOT NULL,
    pondok_id BIGINT UNSIGNED NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_musyrif_profiles_user (user_id),
    KEY idx_musyrif_profiles_scope (type, pondok_id, status),
    CONSTRAINT chk_musyrif_scope CHECK (
        (type = 'platform' AND pondok_id IS NULL)
        OR (type = 'pondok' AND pondok_id IS NOT NULL)
    ),
    CONSTRAINT fk_musyrif_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_musyrif_profiles_pondok FOREIGN KEY (pondok_id) REFERENCES pondoks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS musyrif_mentees (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    musyrif_profile_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    status ENUM('active','ended') NOT NULL DEFAULT 'active',
    assigned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ended_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_musyrif_mentees_pair (musyrif_profile_id, user_id),
    KEY idx_musyrif_mentees_user (user_id, status),
    CONSTRAINT fk_musyrif_mentees_profile FOREIGN KEY (musyrif_profile_id) REFERENCES musyrif_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_musyrif_mentees_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS halaqahs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    pondok_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    musyrif_profile_id BIGINT UNSIGNED NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_halaqahs_pondok_name (pondok_id, name),
    KEY idx_halaqahs_musyrif (musyrif_profile_id, status),
    CONSTRAINT fk_halaqahs_pondok FOREIGN KEY (pondok_id) REFERENCES pondoks(id) ON DELETE CASCADE,
    CONSTRAINT fk_halaqahs_musyrif FOREIGN KEY (musyrif_profile_id) REFERENCES musyrif_profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS halaqah_memberships (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    halaqah_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    status ENUM('active','inactive','left') NOT NULL DEFAULT 'active',
    joined_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ended_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_halaqah_memberships_halaqah (halaqah_id, status),
    KEY idx_halaqah_memberships_user (user_id, status),
    CONSTRAINT fk_halaqah_memberships_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id) ON DELETE CASCADE,
    CONSTRAINT fk_halaqah_memberships_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS halaqah_transfer_requests (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    pondok_id BIGINT UNSIGNED NOT NULL,
    from_halaqah_id BIGINT UNSIGNED NULL,
    to_halaqah_id BIGINT UNSIGNED NOT NULL,
    reason TEXT NULL,
    status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
    requested_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    reviewed_by BIGINT UNSIGNED NULL,
    reviewed_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_transfer_requests_user (user_id, status),
    KEY idx_transfer_requests_pondok (pondok_id, status),
    CONSTRAINT fk_transfer_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_transfer_pondok FOREIGN KEY (pondok_id) REFERENCES pondoks(id) ON DELETE CASCADE,
    CONSTRAINT fk_transfer_from_halaqah FOREIGN KEY (from_halaqah_id) REFERENCES halaqahs(id) ON DELETE SET NULL,
    CONSTRAINT fk_transfer_to_halaqah FOREIGN KEY (to_halaqah_id) REFERENCES halaqahs(id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfer_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS tahfidz_programs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    scope_type ENUM('personal','pondok') NOT NULL,
    owner_user_id BIGINT UNSIGNED NULL,
    pondok_id BIGINT UNSIGNED NULL,
    name VARCHAR(190) NOT NULL,
    description TEXT NULL,
    target_pages_per_day DECIMAL(5,2) NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    status ENUM('draft','active','inactive','completed') NOT NULL DEFAULT 'active',
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    KEY idx_tahfidz_programs_personal (owner_user_id, status),
    KEY idx_tahfidz_programs_pondok (pondok_id, status),
    CONSTRAINT chk_tahfidz_program_scope CHECK (
        (scope_type = 'personal' AND owner_user_id IS NOT NULL AND pondok_id IS NULL)
        OR (scope_type = 'pondok' AND owner_user_id IS NULL AND pondok_id IS NOT NULL)
    ),
    CONSTRAINT fk_tahfidz_programs_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tahfidz_programs_pondok FOREIGN KEY (pondok_id) REFERENCES pondoks(id) ON DELETE CASCADE,
    CONSTRAINT fk_tahfidz_programs_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS program_enrollments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    program_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    context_type ENUM('personal','pondok') NOT NULL,
    pondok_id BIGINT UNSIGNED NULL,
    halaqah_id BIGINT UNSIGNED NULL,
    status ENUM('active','paused','completed','cancelled') NOT NULL DEFAULT 'active',
    started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    completed_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_program_enrollments_user_context (user_id, context_type, pondok_id, status),
    KEY idx_program_enrollments_program (program_id, status),
    KEY idx_program_enrollments_halaqah (halaqah_id, status),
    CONSTRAINT chk_program_enrollment_context CHECK (
        (context_type = 'personal' AND pondok_id IS NULL AND halaqah_id IS NULL)
        OR (context_type = 'pondok' AND pondok_id IS NOT NULL)
    ),
    CONSTRAINT fk_program_enrollments_program FOREIGN KEY (program_id) REFERENCES tahfidz_programs(id) ON DELETE CASCADE,
    CONSTRAINT fk_program_enrollments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_program_enrollments_pondok FOREIGN KEY (pondok_id) REFERENCES pondoks(id) ON DELETE CASCADE,
    CONSTRAINT fk_program_enrollments_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS daily_progress (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    enrollment_id BIGINT UNSIGNED NOT NULL,
    week_no SMALLINT UNSIGNED NOT NULL,
    day_code ENUM('sabtu','ahad','senin','selasa','rabu','kamis') NOT NULL,
    progress_date DATE NULL,
    target_pages DECIMAL(5,2) NULL,
    murajaah_juz VARCHAR(100) NULL,
    rabth_awal VARCHAR(150) NULL,
    rabth_akhir VARCHAR(150) NULL,
    hafalan_kemarin_checks JSON NULL,
    istima_checks JSON NULL,
    menghafal_done BOOLEAN NOT NULL DEFAULT FALSE,
    merekam_done BOOLEAN NOT NULL DEFAULT FALSE,
    tikrar_checks JSON NULL,
    completion_percent TINYINT UNSIGNED NOT NULL DEFAULT 0,
    version INT UNSIGNED NOT NULL DEFAULT 1,
    client_updated_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_daily_progress_enrollment_day (enrollment_id, week_no, day_code),
    KEY idx_daily_progress_date (enrollment_id, progress_date),
    CONSTRAINT chk_daily_progress_percent CHECK (completion_percent <= 100),
    CONSTRAINT fk_daily_progress_enrollment FOREIGN KEY (enrollment_id) REFERENCES program_enrollments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS submissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    client_uuid CHAR(36) NOT NULL,
    enrollment_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    pondok_id BIGINT UNSIGNED NULL,
    halaqah_id BIGINT UNSIGNED NULL,
    juz TINYINT UNSIGNED NULL,
    surah VARCHAR(150) NULL,
    page_start SMALLINT UNSIGNED NULL,
    page_end SMALLINT UNSIGNED NULL,
    ayah_start SMALLINT UNSIGNED NULL,
    ayah_end SMALLINT UNSIGNED NULL,
    audio_path VARCHAR(500) NULL,
    status ENUM('pending','reviewed','cancelled') NOT NULL DEFAULT 'pending',
    version INT UNSIGNED NOT NULL DEFAULT 1,
    submitted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_submissions_client_uuid (client_uuid),
    KEY idx_submissions_user_status (user_id, status, submitted_at),
    KEY idx_submissions_halaqah_status (halaqah_id, status, submitted_at),
    CONSTRAINT fk_submissions_enrollment FOREIGN KEY (enrollment_id) REFERENCES program_enrollments(id) ON DELETE CASCADE,
    CONSTRAINT fk_submissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_submissions_pondok FOREIGN KEY (pondok_id) REFERENCES pondoks(id) ON DELETE CASCADE,
    CONSTRAINT fk_submissions_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS submission_reviews (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    submission_id BIGINT UNSIGNED NOT NULL,
    reviewer_user_id BIGINT UNSIGNED NOT NULL,
    decision ENUM('mutqin','cukup_stabil','penguatan','ulang') NOT NULL,
    notes TEXT NULL,
    reviewed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_submission_reviews_submission (submission_id, reviewed_at),
    KEY idx_submission_reviews_reviewer (reviewer_user_id, reviewed_at),
    CONSTRAINT fk_submission_reviews_submission FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_reviews_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(190) NOT NULL,
    body TEXT NOT NULL,
    payload JSON NULL,
    read_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_notifications_user_read (user_id, read_at, created_at),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS whatsapp_outbox (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NULL,
    pondok_id BIGINT UNSIGNED NULL,
    type VARCHAR(100) NOT NULL,
    recipient_phone_e164 VARCHAR(30) NOT NULL,
    payload JSON NOT NULL,
    status ENUM('queued','processing','sent','failed') NOT NULL DEFAULT 'queued',
    attempt_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    provider_message_id VARCHAR(190) NULL,
    last_error TEXT NULL,
    scheduled_at DATETIME(3) NULL,
    sent_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_whatsapp_outbox_queue (status, scheduled_at, created_at),
    KEY idx_whatsapp_outbox_user (user_id, created_at),
    KEY idx_whatsapp_outbox_pondok (pondok_id, created_at),
    CONSTRAINT fk_whatsapp_outbox_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_whatsapp_outbox_pondok FOREIGN KEY (pondok_id) REFERENCES pondoks(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS sync_clients (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    client_uuid CHAR(36) NOT NULL,
    name VARCHAR(150) NULL,
    platform VARCHAR(80) NULL,
    last_seen_at DATETIME(3) NULL,
    last_pull_cursor BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_sync_clients_user_uuid (user_id, client_uuid),
    CONSTRAINT fk_sync_clients_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS sync_operations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    sync_client_id BIGINT UNSIGNED NOT NULL,
    operation_id CHAR(36) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NULL,
    action ENUM('create','update','delete') NOT NULL,
    request_hash CHAR(64) NULL,
    result_version INT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_sync_operations_idempotency (user_id, sync_client_id, operation_id),
    KEY idx_sync_operations_entity (entity_type, entity_id),
    CONSTRAINT fk_sync_operations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sync_operations_client FOREIGN KEY (sync_client_id) REFERENCES sync_clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS sync_changes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    scope_type ENUM('personal','pondok','platform') NOT NULL,
    scope_id BIGINT UNSIGNED NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    operation ENUM('upsert','delete') NOT NULL,
    version INT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_sync_changes_scope_cursor (scope_type, scope_id, id),
    KEY idx_sync_changes_entity (entity_type, entity_id, id),
    CONSTRAINT chk_sync_changes_scope CHECK (
        (scope_type = 'platform' AND scope_id IS NULL)
        OR (scope_type IN ('personal','pondok') AND scope_id IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    actor_user_id BIGINT UNSIGNED NULL,
    scope_type ENUM('platform','pondok','user') NOT NULL,
    scope_id BIGINT UNSIGNED NULL,
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NULL,
    metadata JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_audit_logs_actor (actor_user_id, created_at),
    KEY idx_audit_logs_scope (scope_type, scope_id, created_at),
    KEY idx_audit_logs_entity (entity_type, entity_id, created_at),
    CONSTRAINT chk_audit_logs_scope CHECK (
        (scope_type = 'platform' AND scope_id IS NULL)
        OR (scope_type IN ('pondok','user') AND scope_id IS NOT NULL)
    ),
    CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS options (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    scope_type ENUM('platform','pondok','user') NOT NULL,
    scope_id BIGINT UNSIGNED NULL,
    scope_key BIGINT UNSIGNED GENERATED ALWAYS AS (IFNULL(scope_id, 0)) STORED,
    option_key VARCHAR(150) NOT NULL,
    option_value JSON NOT NULL,
    value_type ENUM('string','integer','boolean','json') NOT NULL DEFAULT 'json',
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_options_scope_key (scope_type, scope_key, option_key),
    KEY idx_options_updated_by (updated_by),
    CONSTRAINT chk_options_scope CHECK (
        (scope_type = 'platform' AND scope_id IS NULL)
        OR (scope_type IN ('pondok','user') AND scope_id IS NOT NULL)
    ),
    CONSTRAINT fk_options_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    ],
];
