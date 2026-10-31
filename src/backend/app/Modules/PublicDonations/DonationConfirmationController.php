<?php

declare(strict_types=1);

namespace App\Modules\PublicDonations;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\LoginValidator;
use App\Modules\Auth\RegistrationException;
use App\Modules\Auth\SessionService;

final class DonationConfirmationController
{
    private function actor(Request $request): array
    {
        $pdo = Database::connection();
        $sessions = new SessionService($pdo, new LoginValidator());
        $user = $sessions->userFromToken(SessionService::bearerToken($request->headers));
        if ($user === null) {
            throw new RegistrationException('Silakan masuk terlebih dahulu.', 401);
        }
        return $user;
    }

    public function confirm(Request $request): never
    {
        try {
            $user = $this->actor($request);
            if (!in_array('donatur', $user['roles'] ?? [], true)) {
                throw new RegistrationException('Aktifkan akun Donatur untuk mengonfirmasi bukti transfer.', 403);
            }
            $service = new DonationConfirmationService(Database::connection());
            $id = $service->confirm((int) $user['id'], $_POST, $_FILES['proof'] ?? []);
            Response::json(['success' => true, 'message' => 'Bukti transfer terkirim ke ustadz untuk diperiksa.', 'data' => ['id' => $id, 'status' => 'reported']], 201);
        } catch (RegistrationException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], $e->statusCode);
        } catch (\Throwable $e) {
            error_log('[Mutqeen donation confirm] ' . $e);
            Response::json(['success' => false, 'message' => 'Bukti transfer gagal disimpan. Periksa migrasi database dan penyimpanan server.'], 500);
        }
    }

    public function reports(Request $request): never
    {
        try {
            $user = $this->actor($request);
            if (!in_array('musyrif', $user['roles'] ?? [], true)) {
                throw new RegistrationException('Hanya ustadz yang dapat melihat laporan masuk.', 403);
            }
            $reports = (new DonationConfirmationService(Database::connection()))->recipientReports((int) $user['id']);
            header('Cache-Control: no-store');
            Response::json(['success' => true, 'data' => $reports]);
        } catch (RegistrationException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], $e->statusCode);
        }
    }

    public function proof(Request $request): never
    {
        try {
            $user = $this->actor($request);
            $id = filter_var($request->query['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) ?: 0;
            $path = (new DonationConfirmationService(Database::connection()))->proofForUser((int) $user['id'], (int) $id);
            header('Content-Type: image/jpeg');
            header('Cache-Control: no-store, private');
            header('X-Content-Type-Options: nosniff');
            header('Content-Disposition: inline');
            header('Content-Length: ' . filesize($path));
            readfile($path);
            exit;
        } catch (RegistrationException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], $e->statusCode);
        }
    }

    public function review(Request $request): never
    {
        try {
            $user = $this->actor($request);
            if (!in_array('musyrif', $user['roles'] ?? [], true)) {
                throw new RegistrationException('Hanya ustadz penerima yang dapat memverifikasi.', 403);
            }
            $data = $request->body();
            (new DonationConfirmationService(Database::connection()))->review(
                (int) $user['id'],
                (int) ($data['id'] ?? 0),
                (string) ($data['status'] ?? '')
            );
            Response::json(['success' => true, 'message' => 'Status transfer diperbarui.']);
        } catch (RegistrationException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], $e->statusCode);
        }
    }
}
