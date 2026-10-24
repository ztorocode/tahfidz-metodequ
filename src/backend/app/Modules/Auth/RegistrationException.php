<?php

declare(strict_types=1);

namespace App\Modules\Auth;

final class RegistrationException extends \RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $statusCode = 422,
        public readonly array $errors = [],
        public readonly ?string $reasonCode = null,
    ) {
        parent::__construct($message);
    }
}
