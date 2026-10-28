<?php

declare(strict_types=1);

namespace App\Modules\PublicDonations;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\LoginValidator;
use App\Modules\Auth\RegistrationException;
use App\Modules\Auth\SessionService;

final class UstadzDonationProfileController
{
    private function actor(Request $request): int
    {
        $pdo = Database::connection();
        $sessions = new SessionService($pdo, new LoginValidator());
        $user = $sessions->userFromToken(SessionService::bearerToken($request->headers));
        if ($user === null) {
            Response::json(['success' => false, 'message' => 'Silakan masuk sebagai ustadz.'], 401);
        }
        return (int) $user['id'];
    }

    private function service(): UstadzDonationProfileService
    {
        return new UstadzDonationProfileService(Database::connection());
    }

    public function show(Request $request): never
    {
        try {
            header('Cache-Control: no-store');
            Response::json(['success' => true, 'data' => $this->service()->show($this->actor($request))]);
        } catch (RegistrationException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], $e->statusCode);
        }
    }

    public function saveBank(Request $request): never
    {
        try {
            $this->service()->saveBank($this->actor($request), $request->body());
            Response::json(['success' => true, 'message' => 'Informasi rekening tersimpan.']);
        } catch (RegistrationException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], $e->statusCode);
        }
    }

    public function uploadPhoto(Request $request): never
    {
        try {
            $this->service()->uploadPhoto($this->actor($request), $_POST, $_FILES['photo'] ?? []);
            Response::json(['success' => true, 'message' => 'Foto aktivitas telah dipublikasikan.'], 201);
        } catch (RegistrationException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], $e->statusCode);
        }
    }

    public function deletePhoto(Request $request): never
    {
        try {
            $this->service()->deletePhoto($this->actor($request), (int) ($request->body()['id'] ?? 0));
            Response::json(['success' => true, 'message' => 'Foto dihapus.']);
        } catch (RegistrationException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], $e->statusCode);
        }
    }
}
