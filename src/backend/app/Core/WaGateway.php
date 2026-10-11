<?php

declare(strict_types=1);

namespace App\Core;

final class WaGateway
{
    public static function fromEnv(): self
    {
        return new self(
            rtrim((string) (getenv('WA_GATEWAY_URL') ?: ''), '/'),
            (string) (getenv('WA_GATEWAY_USER') ?: ''),
            (string) (getenv('WA_GATEWAY_PASSWORD') ?: ''),
            (string) (getenv('WA_DEVICE_ID') ?: ''),
        );
    }

    public function __construct(
        private readonly string $baseUrl,
        private readonly string $username,
        private readonly string $password,
        private readonly string $deviceId,
    ) {
    }

    public function sendText(string $phoneE164, string $message): void
    {
        if ($this->baseUrl === '' || $this->username === '' || $this->password === '') {
            throw new \RuntimeException('Konfigurasi gateway WhatsApp belum lengkap.');
        }

        $digits = ltrim(preg_replace('/\D+/', '', $phoneE164) ?? '', '+');
        $url = $this->baseUrl . '/send/message?device_id=' . urlencode($this->deviceId);

        $payload = json_encode(['phone' => $digits, 'message' => $message], JSON_UNESCAPED_UNICODE);
        if ($payload === false) {
            throw new \RuntimeException('Gagal menyusun pesan WhatsApp.');
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_USERPWD => $this->username . ':' . $this->password,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_TIMEOUT => 20,
        ]);
        $body = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($body === false) {
            throw new \RuntimeException('Gateway WhatsApp tidak merespons: ' . $error);
        }

        $decoded = json_decode((string) $body, true);
        if ($httpCode < 200 || $httpCode >= 300 || ($decoded['code'] ?? '') !== 'SUCCESS') {
            throw new \RuntimeException('Gagal mengirim WhatsApp: ' . substr((string) $body, 0, 200));
        }
    }
}
