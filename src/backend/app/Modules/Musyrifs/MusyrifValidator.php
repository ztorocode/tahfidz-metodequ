<?php

declare(strict_types=1);

namespace App\Modules\Musyrifs;

use App\Modules\Auth\RegistrationException;

final class MusyrifValidator
{
    public function validate(array $input): array
    {
        $pondokId = (int) ($input['pondok_id'] ?? 0);
        $name = trim((string) ($input['name'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $password = (string) ($input['password'] ?? '');
        $phone = $this->normalizePhone((string) ($input['phone'] ?? ''));

        $errors = [];
        if ($pondokId <= 0) {
            $errors['pondok_id'] = 'Pondok wajib dipilih.';
        }
        if (mb_strlen($name) < 2 || mb_strlen($name) > 150) {
            $errors['name'] = 'Nama harus 2-150 karakter.';
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
            $errors['email'] = 'Email tidak valid.';
        }
        if ($phone === null) {
            $errors['phone'] = 'Nomor WhatsApp tidak valid.';
        }
        if (strlen($password) < 8 || strlen($password) > 255) {
            $errors['password'] = 'Password minimal 8 karakter.';
        }

        if ($errors !== []) {
            throw new RegistrationException('Data ustadz belum valid.', 422, $errors);
        }

        $username = substr($email, 0, (int) strpos($email, '@'));

        return [
            'pondok_id' => $pondokId,
            'name' => $name,
            'username' => $username,
            'email' => $email,
            'phone' => $phone,
            'password' => $password,
        ];
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
