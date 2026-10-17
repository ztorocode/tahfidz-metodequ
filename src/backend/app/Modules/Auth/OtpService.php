<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use App\Core\WaGateway;
use App\Core\WaSender;
use PDO;

final class OtpService
{
    private const CODE_TTL_MINUTES = 5;
    private const MAX_ATTEMPTS = 5;
    private const MAX_REQUESTS_PER_HOUR = 5;

    public function __construct(
        private readonly PDO $pdo,
        private readonly WaGateway $gateway,
    ) {
    }

    /** @return array{expires_in_minutes:int} */
    public function request(string $phoneRaw, string $purpose = 'login'): array
    {
        $phone = $this->normalizePhone($phoneRaw);
        if ($phone === null) {
            throw new RegistrationException('Nomor WhatsApp tidak valid.', 422, ['phone' => 'Nomor WhatsApp tidak valid.']);
        }

        $throttle = $this->pdo->prepare(
            'SELECT COUNT(*) FROM otp_challenges
             WHERE phone_e164 = :phone AND purpose = :purpose AND created_at > DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 1 HOUR)'
        );
        $throttle->execute(['phone' => $phone, 'purpose' => $purpose]);
        if ((int) $throttle->fetchColumn() >= self::MAX_REQUESTS_PER_HOUR) {
            throw new RegistrationException('Terlalu sering meminta kode. Coba lagi nanti.', 429);
        }

        $userStmt = $this->pdo->prepare('SELECT id FROM users WHERE phone_e164 = :phone LIMIT 1');
        $userStmt->execute(['phone' => $phone]);
        $userId = $userStmt->fetchColumn();

        $code = (string) random_int(100000, 999999);
        $hash = password_hash($code, PASSWORD_DEFAULT);
        if ($hash === false) {
            throw new \RuntimeException('Gagal membuat kode OTP.');
        }

        $insert = $this->pdo->prepare(
            'INSERT INTO otp_challenges (user_id, phone_e164, purpose, otp_hash, expires_at)
             VALUES (:user_id, :phone, :purpose, :otp_hash, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 5 MINUTE))'
        );
        $insert->execute([
            'user_id' => $userId === false ? null : (int) $userId,
            'phone' => $phone,
            'purpose' => $purpose,
            'otp_hash' => $hash,
        ]);

        $result = (new WaSender($this->pdo, $this->gateway))->send([
            'type' => 'otp',
            'phone' => $phone,
            'message' => 'Kode OTP MetodeQu Anda: ' . $code . ' (berlaku 5 menit). Jangan bagikan ke siapa pun.',
            'user_id' => $userId === false ? null : (int) $userId,
        ]);
        if ($result['status'] !== 'sent') {
            throw new RegistrationException('Gagal mengirim kode via WhatsApp. Coba lagi.', 502);
        }

        return ['expires_in_minutes' => self::CODE_TTL_MINUTES];
    }

    /** @return array{id:int,name:string,username:string,email:string,phone_e164:string,email_verified_at:?string,status:string} */
    public function verify(string $phoneRaw, string $code, string $purpose = 'login'): array
    {
        $phone = $this->normalizePhone($phoneRaw);
        if ($phone === null) {
            throw new RegistrationException('Nomor WhatsApp tidak valid.', 422);
        }

        $code = trim($code);
        if (!preg_match('/^\d{6}$/', $code)) {
            throw new RegistrationException('Kode OTP harus 6 digit.', 422);
        }

        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            $statement = $this->pdo->prepare(
                'SELECT id, otp_hash, attempt_count, expires_at, verified_at
                 FROM otp_challenges
                 WHERE phone_e164 = :phone AND purpose = :purpose AND verified_at IS NULL
                 ORDER BY id DESC LIMIT 1 FOR UPDATE'
            );
            $statement->execute(['phone' => $phone, 'purpose' => $purpose]);
            $row = $statement->fetch(PDO::FETCH_ASSOC);

            if (!is_array($row)) {
                throw new RegistrationException('Minta kode OTP terlebih dahulu.', 410);
            }

            if (strtotime((string) $row['expires_at']) < time()) {
                if ($ownsTransaction) {
                    $this->pdo->commit();
                }
                throw new RegistrationException('Kode kedaluwarsa. Minta kode baru.', 410);
            }

            if ((int) $row['attempt_count'] >= self::MAX_ATTEMPTS) {
                if ($ownsTransaction) {
                    $this->pdo->commit();
                }
                throw new RegistrationException('Terlalu banyak percobaan. Minta kode baru.', 429);
            }

            $this->pdo->prepare(
                'UPDATE otp_challenges SET attempt_count = attempt_count + 1 WHERE id = :id'
            )->execute(['id' => (int) $row['id']]);

            if (!password_verify($code, (string) $row['otp_hash'])) {
                if ($ownsTransaction) {
                    $this->pdo->commit();
                }
                throw new RegistrationException('Kode OTP salah.', 401);
            }

            $this->pdo->prepare(
                'UPDATE otp_challenges SET verified_at = CURRENT_TIMESTAMP(3) WHERE id = :id'
            )->execute(['id' => (int) $row['id']]);

            $userStmt = $this->pdo->prepare(
                'SELECT id, name, username, email, phone_e164, email_verified_at, status
                 FROM users WHERE phone_e164 = :phone LIMIT 1'
            );
            $userStmt->execute(['phone' => $phone]);
            $user = $userStmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($user)) {
                if ($ownsTransaction) {
                    $this->pdo->commit();
                }
                throw new RegistrationException('Nomor belum terdaftar. Daftar dulu ya.', 404);
            }

            if ($user['status'] !== 'active') {
                if ($ownsTransaction) {
                    $this->pdo->commit();
                }
                throw new RegistrationException('Akun tidak aktif.', 403);
            }

            if ($ownsTransaction) {
                $this->pdo->commit();
            }

            return $user;
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    private function normalizePhone(string $value): ?string
    {
        $digits = preg_replace('/\D+/', '', trim($value)) ?? '';
        if ($digits === '') {
            return null;
        }
        if (str_starts_with($digits, '0')) {
            $digits = '62' . substr($digits, 1);
        } elseif (str_starts_with($digits, '8')) {
            $digits = '62' . $digits;
        }
        if (!preg_match('/^[1-9][0-9]{7,14}$/', $digits)) {
            return null;
        }
        return '+' . $digits;
    }
}
