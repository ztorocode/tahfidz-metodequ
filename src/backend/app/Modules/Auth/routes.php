<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\LoginController;
use App\Modules\Auth\OtpController;
use App\Modules\Auth\RegisterController;
use App\Modules\Auth\SessionController;
use App\Modules\Auth\VerifyEmailController;
use App\Modules\Auth\ResendVerificationController;

return static function (Router $router): void {
    $router->post('/api/auth/register', new RegisterController());
    $router->get('/api/auth/verify-email', new VerifyEmailController());
    $router->post('/api/auth/verify-email', new VerifyEmailController());
    $router->post('/api/auth/verify-email/resend', new ResendVerificationController());
    $router->post('/api/auth/login', new LoginController());
    $router->get('/api/auth/me', [new SessionController(), 'me']);
    $router->post('/api/auth/logout', [new SessionController(), 'logout']);
    $router->post('/api/auth/otp/request', [new OtpController(), 'request']);
    $router->post('/api/auth/otp/verify', [new OtpController(), 'verify']);
};
