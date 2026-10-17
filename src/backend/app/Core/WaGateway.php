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

    /** Status koneksi perangkat (GET /app/status). */
    public function status(?string $deviceId = null): array
    {
        $data = $this->call('/app/status', $deviceId);
        if (($data['code'] ?? '') !== 'SUCCESS') {
            throw new \RuntimeException($this->errorOf($data, 'Gagal membaca status WhatsApp.'));
        }

        $results = is_array($data['results'] ?? null) ? $data['results'] : [];
        return [
            'device_id' => (string) ($results['device_id'] ?? $this->deviceOf($deviceId)),
            'is_connected' => (bool) ($results['is_connected'] ?? false),
            'is_logged_in' => (bool) ($results['is_logged_in'] ?? false),
            'jid' => (string) ($results['jid'] ?? ''),
        ];
    }

    /** Minta QR pairing baru (GET /app/login) dan ambil gambarnya. */
    public function qr(?string $deviceId = null): array
    {
        $data = $this->call('/app/login', $deviceId);
        $code = (string) ($data['code'] ?? '');
        if ($code === 'ALREADY_LOGGED_IN') {
            throw new \RuntimeException('Perangkat sudah terhubung ke WhatsApp. Tidak perlu memindai QR.');
        }
        if ($code !== 'SUCCESS') {
            throw new \RuntimeException($this->errorOf($data, 'Gagal membuat QR.'));
        }

        $results = is_array($data['results'] ?? null) ? $data['results'] : [];
        $link = (string) ($results['qr_link'] ?? '');

        return [
            'device_id' => (string) ($results['device_id'] ?? $this->deviceOf($deviceId)),
            'qr_duration' => (int) ($results['qr_duration'] ?? 30),
            'qr_image' => $this->qrImage($link), // data URI bila berhasil diambil, else null
            'qr_link' => $link,                  // cadangan bila gambar tidak bisa diambil
        ];
    }

    /** Putuskan sesi aktif tanpa menghapus slot device (GET /app/logout). */
    public function logout(?string $deviceId = null): array
    {
        $data = $this->call('/app/logout', $deviceId);
        if (($data['code'] ?? '') !== 'SUCCESS') {
            throw new \RuntimeException($this->errorOf($data, 'Gagal memutus koneksi.'));
        }

        return ['message' => (string) ($data['message'] ?? 'Device logged out.')];
    }

    /** Sambungkan ulang koneksi yang terputus (GET /app/reconnect). */
    public function reconnect(?string $deviceId = null): array
    {
        $data = $this->call('/app/reconnect', $deviceId);
        if (($data['code'] ?? '') !== 'SUCCESS') {
            throw new \RuntimeException($this->errorOf($data, 'Gagal menyambungkan ulang.'));
        }

        return ['message' => (string) ($data['message'] ?? 'Reconnect requested.')];
    }

    /** Buat slot device baru di gateway (POST /devices). */
    public function createDevice(string $deviceId): array
    {
        $data = $this->postJson('/devices', ['device_id' => $deviceId], $deviceId);
        if (($data['code'] ?? '') !== 'SUCCESS') {
            throw new \RuntimeException($this->errorOf($data, 'Gagal membuat device di gateway.'));
        }

        return is_array($data['results'] ?? null) ? $data['results'] : ['device_id' => $deviceId];
    }

    private function deviceOf(?string $deviceId): string
    {
        $value = trim((string) ($deviceId ?? ''));
        return $value !== '' ? $value : $this->deviceId;
    }

    /** @return array<string, mixed> */
    private function call(string $path, ?string $deviceId = null): array
    {
        if ($this->baseUrl === '' || $this->username === '' || $this->password === '') {
            throw new \RuntimeException('Konfigurasi gateway WhatsApp belum lengkap.');
        }

        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERPWD => $this->username . ':' . $this->password,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'X-Device-Id: ' . $this->deviceOf($deviceId),
            ],
            CURLOPT_TIMEOUT => 25,
        ]);
        $body = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($body === false) {
            throw new \RuntimeException('Gateway WhatsApp tidak merespons: ' . $error);
        }

        $decoded = json_decode((string) $body, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Gateway WhatsApp merespons tidak valid (' . $httpCode . ').');
        }

        return $decoded;
    }

    /** @param array<string, mixed> $payload */
    private function postJson(string $path, array $payload, ?string $deviceId = null): array
    {
        if ($this->baseUrl === '' || $this->username === '' || $this->password === '') {
            throw new \RuntimeException('Konfigurasi gateway WhatsApp belum lengkap.');
        }

        $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE);
        if ($encoded === false) {
            throw new \RuntimeException('Gagal menyusun permintaan device.');
        }

        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_USERPWD => $this->username . ':' . $this->password,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'Content-Type: application/json',
                'X-Device-Id: ' . $this->deviceOf($deviceId),
            ],
            CURLOPT_POSTFIELDS => $encoded,
            CURLOPT_TIMEOUT => 25,
        ]);
        $body = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($body === false) {
            throw new \RuntimeException('Gateway WhatsApp tidak merespons: ' . $error);
        }

        $decoded = json_decode((string) $body, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Gateway WhatsApp merespons tidak valid.');
        }

        return $decoded;
    }

    /** Ambil gambar QR lalu kembalikan sebagai data URI. */
    private function qrImage(string $link): ?string
    {
        if ($link === '') {
            return null;
        }

        // qr_link dari GOWA bisa memakai host internal (localhost); ambil path-nya saja
        // lalu tuju ke base URL gateway agar bisa diambil dari luar.
        $parsed = parse_url($link);
        $path = (string) ($parsed['path'] ?? '');
        if ($path === '') {
            return null;
        }
        if (isset($parsed['query'])) {
            $path .= '?' . $parsed['query'];
        }

        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERPWD => $this->username . ':' . $this->password,
            CURLOPT_TIMEOUT => 20,
        ]);
        $body = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $mime = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);

        if ($body === false || $httpCode < 200 || $httpCode >= 300 || $body === '') {
            return null;
        }

        if ($mime === '' || !str_starts_with($mime, 'image/')) {
            $mime = 'image/png';
        }

        return 'data:' . $mime . ';base64,' . base64_encode((string) $body);
    }

    /** @param array<string, mixed> $data */
    private function errorOf(array $data, string $fallback): string
    {
        $message = (string) ($data['message'] ?? '');
        return $message !== '' ? $message : $fallback;
    }
}
