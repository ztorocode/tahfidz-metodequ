<?php

declare(strict_types=1);

namespace App\Modules\Auth;

/** Kirim link verifikasi email — dipakai saat daftar maupun saat kirim ulang. */
final class VerificationMailer
{
    public function send(string $email, string $name, string $token, bool $welcome = true): bool
    {
        // Smoke test memakai email dummy: jangan kirim email asli.
        if (str_ends_with($email, '@invalid.example')) {
            return false;
        }

        $mailer = \App\Core\SmtpMailer::fromConfig();
        $baseUrl = rtrim((string) (getenv('APP_URL') ?: ''), '/');
        $verifyUrl = $baseUrl . '/api/auth/verify-email?token=' . urlencode($token);
        $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');

        $opening = $welcome
            ? 'Selamat datang di <strong>MetodeQu</strong> — akun Anda telah terdaftar.'
            : 'Berikut link verifikasi email akun MetodeQu Anda.';
        $subject = $welcome
            ? 'Selamat datang di MetodeQu — verifikasi email Anda'
            : 'Verifikasi email akun MetodeQu Anda';

        $html = "<p>Halo {$safeName},</p>"
            . "<p>{$opening}</p>"
            . '<p>Silakan verifikasi email Anda dengan mengklik link berikut (berlaku 48 jam):</p>'
            . "<p><a href=\"{$verifyUrl}\">Verifikasi Email Saya</a></p>"
            . "<p>Jika tombol tidak berfungsi, salin link ini ke browser:<br>{$verifyUrl}</p>"
            . '<p>Abaikan email ini jika Anda tidak mendaftar.</p>';

        $text = "Halo {$name},\n\n"
            . ($welcome ? 'Selamat datang di MetodeQu — akun Anda telah terdaftar.' : 'Berikut link verifikasi email akun MetodeQu Anda.')
            . "\n\nVerifikasi email Anda (berlaku 48 jam):\n{$verifyUrl}\n\nAbaikan email ini jika Anda tidak mendaftar.";

        $mailer->send($email, $subject, $html, $text);

        return true;
    }
}
