<?php

declare(strict_types=1);

namespace App\Core;

use PDO;
use Throwable;

/**
 * Kirim pesan WhatsApp sambil mencatat ke whatsapp_outbox
 * sehingga tab "Riwayat Pengiriman" menampilkan pengiriman riil.
 */
final class WaSender
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly WaGateway $gateway,
    ) {
    }

    /**
     * @param array{
     *     type:string,
     *     phone:string,
     *     message:string,
     *     pondok_id?:int|null,
     *     user_id?:int|null,
     *     device_id?:string|null
     * } $job
     * @return array{id:int,status:string,error:?string}
     */
    public function send(array $job): array
    {
        $phone = (string) ($job['phone'] ?? '');
        $message = (string) ($job['message'] ?? '');
        $pondokId = isset($job['pondok_id']) ? (int) $job['pondok_id'] : null;
        $userId = isset($job['user_id']) ? (int) $job['user_id'] : null;

        $id = $this->enqueue([
            'type' => (string) ($job['type'] ?? 'general'),
            'phone' => $phone,
            'message' => $message,
            'pondok_id' => $pondokId,
            'user_id' => $userId,
        ]);

        try {
            $this->gateway->sendText($phone, $message, $job['device_id'] ?? null);
            $this->update($id, 'sent', null);
            return ['id' => $id, 'status' => 'sent', 'error' => null];
        } catch (Throwable $exception) {
            $error = $exception->getMessage();
            $this->update($id, 'failed', $error);
            error_log('MetodeQu kirim WA gagal (' . ($job['type'] ?? 'general') . '): ' . $error);
            return ['id' => $id, 'status' => 'failed', 'error' => $error];
        }
    }

    /** @param array{type:string,phone:string,message:string,pondok_id:?int,user_id:?int} $job */
    private function enqueue(array $job): int
    {
        try {
            $payload = json_encode(['message' => $job['message']], JSON_UNESCAPED_UNICODE);
            if ($payload === false) {
                $payload = '{"message":""}';
            }

            $statement = $this->pdo->prepare(
                'INSERT INTO whatsapp_outbox (user_id, pondok_id, type, recipient_phone_e164, payload, status, attempt_count, sent_at)
                 VALUES (:user_id, :pondok_id, :type, :phone, :payload, \'processing\', 1, NULL)'
            );
            $statement->execute([
                'user_id' => $job['user_id'],
                'pondok_id' => $job['pondok_id'],
                'type' => $job['type'],
                'phone' => $job['phone'],
                'payload' => $payload,
            ]);

            return (int) $this->pdo->lastInsertId();
        } catch (Throwable $exception) {
            error_log('MetodeQu outbox insert gagal: ' . $exception->getMessage());
            return 0;
        }
    }

    private function update(int $id, string $status, ?string $error): void
    {
        if ($id < 1) {
            return;
        }

        try {
            $statement = $this->pdo->prepare(
                "UPDATE whatsapp_outbox
                 SET status = :status, last_error = :error,
                     sent_at = IF(:is_sent = 1, CURRENT_TIMESTAMP(3), sent_at)
                 WHERE id = :id"
            );
            $statement->execute([
                'status' => $status,
                'error' => $error,
                'is_sent' => $status === 'sent' ? 1 : 0,
                'id' => $id,
            ]);
        } catch (Throwable $exception) {
            error_log('MetodeQu outbox update gagal: ' . $exception->getMessage());
        }
    }
}
