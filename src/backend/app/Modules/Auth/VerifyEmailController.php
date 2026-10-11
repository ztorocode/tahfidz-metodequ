<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;

final class VerifyEmailController
{
    public function __invoke(Request $request): never
    {
        $token = (string) ($request->query['token'] ?? $request->body()['token'] ?? '');

        if ($token === '') {
            if ($request->method === 'GET') {
                $this->html('Link verifikasi tidak valid.', false);
            }
            Response::json([
                'success' => false,
                'message' => 'Token verifikasi wajib diisi.',
            ], 422);
        }

        try {
            $service = new VerificationService(Database::connection());
            $result = $service->verify($token);
        } catch (\Throwable $exception) {
            if ($request->method === 'GET') {
                $this->html('Terjadi kesalahan, silakan coba lagi.', false);
            }
            Response::json(['success' => false, 'message' => 'Verifikasi gagal.'], 500);
        }

        if ($result === null) {
            if ($request->method === 'GET') {
                $this->html('Link verifikasi tidak valid atau sudah kedaluwarsa.', false);
            }
            Response::json([
                'success' => false,
                'message' => 'Link verifikasi tidak valid atau sudah kedaluwarsa.',
            ], 410);
        }

        if ($request->method === 'GET') {
            $name = htmlspecialchars($result['name'] ?? '', ENT_QUOTES, 'UTF-8');
            $this->html(
                isset($result['already'])
                    ? "Halo {$name}, email Anda sudah terverifikasi sebelumnya. Silakan login."
                    : "Halo {$name}, email Anda berhasil diverifikasi. Silakan login ke MetodeQu.",
                true
            );
        }

        Response::json([
            'success' => true,
            'message' => isset($result['already']) ? 'Email sudah terverifikasi.' : 'Email berhasil diverifikasi.',
            'data' => ['email' => $result['email']],
        ]);
    }

    private function html(string $message, bool $ok): never
    {
        http_response_code($ok ? 200 : 400);
        header('Content-Type: text/html; charset=utf-8');
        $safe = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
        $color = $ok ? '#166534' : '#991b1b';
        echo "<!doctype html><html lang=\"id\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Verifikasi Email MetodeQu</title></head>"
            . "<body style=\"font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f8fafc;margin:0\">"
            . "<div style=\"max-width:480px;padding:32px;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center\">"
            . "<h1 style=\"color:{$color};font-size:20px\">{$safe}</h1>"
            . '<p><a href="/">Kembali ke MetodeQu</a></p></div></body></html>';
        exit;
    }
}
