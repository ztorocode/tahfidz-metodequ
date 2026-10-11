<?php

declare(strict_types=1);

namespace App\Modules\Auth;

final class RegisterValidator
{
    public function validate(array $input): array
    {
        $mode = strtolower(trim((string) ($input['mode'] ?? 'personal')));
        $name = trim((string) ($input['name'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $password = (string) ($input['password'] ?? '');
        $phone = $this->normalizePhone((string) ($input['phone'] ?? ''));

        $errors = [];

        if (!in_array($mode, ['personal', 'pondok'], true)) {
            $errors['mode'] = 'Jenis pendaftaran tidak valid.';
        }

        if (mb_strlen($name) < 2 || mb_strlen($name) > 150) {
            $errors['name'] = 'Nama harus 2-150 karakter.';
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
            $errors['email'] = 'Email tidak valid.';
        }

        $username = $this->usernameFromEmail($email);
        if ($username === '') {
            $errors['email'] = 'Bagian email sebelum @ tidak dapat digunakan sebagai username.';
        }

        if ($phone === null) {
            $errors['phone'] = 'Nomor WhatsApp tidak valid.';
        }

        if (strlen($password) < 8 || strlen($password) > 255) {
            $errors['password'] = 'Password minimal 8 karakter.';
        }

        $pondokName = trim((string) ($input['pondok_name'] ?? ''));
        $pondokAddress = trim((string) ($input['pondok_address'] ?? ''));
        $pondokPhoneRaw = trim((string) ($input['pondok_phone'] ?? ''));
        $pondokPhone = $pondokPhoneRaw === '' ? null : $this->normalizePhone($pondokPhoneRaw);

        if ($mode === 'pondok') {
            if (mb_strlen($pondokName) < 2 || mb_strlen($pondokName) > 190) {
                $errors['pondok_name'] = 'Nama pondok harus 2-190 karakter.';
            }

            if ($pondokAddress === '' || mb_strlen($pondokAddress) > 5000) {
                $errors['pondok_address'] = 'Alamat pondok wajib diisi.';
            }

            if ($pondokPhoneRaw !== '' && $pondokPhone === null) {
                $errors['pondok_phone'] = 'Nomor WhatsApp pondok tidak valid.';
            }
        }

        if ($errors !== []) {
            throw new RegistrationException(
                'Data pendaftaran belum valid.',
                422,
                $errors,
            );
        }

        return [
            'mode' => $mode,
            'name' => $name,
            'username' => $username,
            'email' => $email,
            'phone' => $phone,
            'password' => $password,
            'pondok_name' => $pondokName,
            'pondok_address' => $pondokAddress,
            'pondok_phone' => $pondokPhone,
        ];
    }

    private function usernameFromEmail(string $email): string
    {
        $position = strpos($email, '@');

        return $position === false ? '' : substr($email, 0, $position);
    }

    private function normalizePhone(string $value): ?string
    {
        $raw = trim($value);
        if ($raw === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $raw) ?? '';
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
