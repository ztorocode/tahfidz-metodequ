<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use PDO;

/** Terbitkan ulang link verifikasi email untuk akun yang belum terverifikasi. */
final class ResendVerificationService
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @return array{email_sent: bool, message: string} */
    public function resend(string $identifier): array
    {
        $identifier = trim($identifier);
        if ($identifier === '') {
            throw new RegistrationException('Email wajib diisi.', 422, ['email' => 'Email wajib diisi.']);
        }

        $statement = $this->pdo->prepare(
            'SELECT id, name, email, phone_e164, email_verified_at FROM users
             WHERE (email = :by_email OR username = :by_username) AND deleted_at IS NULL
             LIMIT 1'
        );
        $statement->execute(['by_email' => $identifier, 'by_username' => $identifier]);
        $user = $statement->fetch(PDO::FETCH_ASSOC);

        // Jangan membocorkan email mana yang terdaftar.
        if (!is_array($user)) {
            return [
                'email_sent' => false,
                'message' => 'Jika email itu terdaftar dan belum diverifikasi, kami sudah mengirim link verifikasi baru.',
            ];
        }

        if ($user['email_verified_at'] !== null) {
            throw new RegistrationException(
                'Email Anda sudah terverifikasi. Silakan masuk.',
                422,
                ['email' => 'Email sudah terverifikasi.']
            );
        }

        // Maksimal satu permintaan per menit supaya tidak dijadikan alat spam.
        $recent = $this->pdo->prepare(
            'SELECT 1 FROM email_verifications
             WHERE user_id = :user_id AND created_at > (NOW(3) - INTERVAL 60 SECOND)
             LIMIT 1'
        );
        $recent->execute(['user_id' => (int) $user['id']]);
        if ($recent->fetchColumn() !== false) {
            throw new RegistrationException(
                'Link verifikasi baru saja dikirim. Tunggu 1 menit sebelum meminta lagi.',
                429,
                []
            );
        }

        $token = bin2hex(random_bytes(32));
        $expiresAt = (new \DateTimeImmutable('+48 hours'))->format('Y-m-d H:i:s');

        $this->pdo->prepare('DELETE FROM email_verifications WHERE user_id = :user_id')
            ->execute(['user_id' => (int) $user['id']]);
        $this->pdo->prepare(
            'INSERT INTO email_verifications (user_id, token_hash, expires_at)
             VALUES (:user_id, :token_hash, :expires_at)'
        )->execute([
            'user_id' => (int) $user['id'],
            'token_hash' => hash('sha256', $token),
            'expires_at' => $expiresAt,
        ]);

        $sent = false;
        try {
            $sent = (new VerificationMailer())->send((string) $user['email'], (string) $user['name'], $token, false);
        } catch (\Throwable $exception) {
            error_log('MetodeQu resend verification failed: ' . $exception->getMessage());
        }

        $waSent = (new VerificationWhatsApp($this->pdo))->send(
            (string) $user['email'],
            (string) $user['name'],
            (string) ($user['phone_e164'] ?? ''),
            $token,
            (int) $user['id'],
            false
        );

        $channels = [];
        if ($sent) {
            $channels[] = 'email ' . $user['email'];
        }
        if ($waSent) {
            $channels[] = 'WhatsApp';
        }

        return [
            'email_sent' => $sent,
            'whatsapp_sent' => $waSent,
            'message' => $channels === []
                ? 'Link verifikasi baru sudah dibuat, tetapi email dan WhatsApp gagal terkirim. Hubungi admin pondok.'
                : 'Link verifikasi baru sudah dikirim lewat ' . implode(' dan ', $channels) . '.',
        ];
    }
}
