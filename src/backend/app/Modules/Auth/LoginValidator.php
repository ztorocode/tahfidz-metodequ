<?php

declare(strict_types=1);

namespace App\Modules\Auth;

final class LoginValidator
{
    public function validate(array $input): array
    {
        $identifier = trim((string) ($input['identifier'] ?? $input['email'] ?? $input['username'] ?? ''));
        $password = (string) ($input['password'] ?? '');

        $errors = [];
        if ($identifier === '' || mb_strlen($identifier) > 190) {
            $errors['identifier'] = 'Email/username/nomor WhatsApp wajib diisi.';
        }
        if ($password === '') {
            $errors['password'] = 'Password wajib diisi.';
        }

        if ($errors !== []) {
            throw new RegistrationException('Data login belum valid.', 422, $errors);
        }

        return ['identifier' => $identifier, 'password' => $password];
    }
}
