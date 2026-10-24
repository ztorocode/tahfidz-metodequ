<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use App\Core\WaGateway;
use App\Core\WaSender;
use PDO;

/**
 * Kirim link verifikasi email + sapaan pendaftaran lewat WhatsApp.
 * Dicatat ke whatsapp_outbox supaya muncul di riwayat pengiriman.
 */
final class VerificationWhatsApp
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function send(
        string $email,
        string $name,
        string $phoneE164,
        string $token,
        int $userId,
        bool $welcome = true,
    ): bool {
        // Smoke test memakai email dummy: jangan kirim WhatsApp asli.
        if ($phoneE164 === '' || str_ends_with($email, '@invalid.example')) {
            return false;
        }

        $baseUrl = rtrim((string) (getenv('APP_URL') ?: ''), '/');
        $verifyUrl = $baseUrl . '/api/auth/verify-email?token=' . urlencode($token);

        $opening = $welcome
            ? "Selamat datang di MetodeQu, {$name}.\nAkun Anda sudah terdaftar."
            : "Halo {$name}.";
        $message = $opening
            . "\n\nVerifikasi email Anda dengan membuka link berikut (berlaku 48 jam):\n"
            . $verifyUrl
            . "\n\nAbaikan pesan ini jika Anda tidak mendaftar.";

        try {
            $result = (new WaSender($this->pdo, WaGateway::fromEnv()))->send([
                'type' => $welcome ? 'welcome' : 'verification',
                'phone' => $phoneE164,
                'message' => $message,
                'user_id' => $userId,
            ]);

            return $result['status'] === 'sent';
        } catch (\Throwable $exception) {
            error_log('MetodeQu WhatsApp verifikasi gagal: ' . $exception->getMessage());

            return false;
        }
    }
}
