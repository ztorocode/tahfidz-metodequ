<?php

declare(strict_types=1);

namespace App\Modules\Health;

final class HealthController
{
    public function __invoke(): array
    {
        return [
            'success' => true,
            'data' => [
                'service' => 'metodequ-backend',
                'status' => 'ok',
                'time' => gmdate(DATE_ATOM),
            ],
        ];
    }
}
