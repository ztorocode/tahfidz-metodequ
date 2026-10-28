<?php

declare(strict_types=1);

namespace App\Modules\PublicDonations;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\LoginValidator;
use App\Modules\Auth\SessionService;

final class PublicUstadzController
{
    public function index(Request $request): never
    {
        $result = (new PublicUstadzService(Database::connection()))->list();
        header('Cache-Control: no-store');
        Response::json(['success' => true, 'data' => $result]);
    }

    public function detail(Request $request): never
    {
        $id = filter_var($request->query['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if (!$id) {
            Response::json(['success' => false, 'message' => 'Ustadz tidak valid.'], 422);
        }
        $result = (new PublicUstadzDetailsService(Database::connection()))->detail((int) $id);
        if ($result === null) {
            Response::json(['success' => false, 'message' => 'Ustadz tidak ditemukan.'], 404);
        }
        header('Cache-Control: no-store');
        Response::json(['success' => true, 'data' => $result]);
    }


    public function students(Request $request): never
    {
        header('Cache-Control: no-store');
        $pdo = Database::connection();
        $sessions = new SessionService($pdo, new LoginValidator());
        $actor = $sessions->userFromToken(SessionService::bearerToken($request->headers));
        if ($actor === null) {
            Response::json(['success' => false, 'message' => 'Login diperlukan untuk melihat nama dan progres santri.'], 401);
        }
        if (!in_array('donatur', $actor['roles'] ?? [], true)) {
            Response::json(['success' => false, 'message' => 'Role Donatur diperlukan untuk melihat nama dan progres santri.'], 403);
        }
        $profileId = filter_var($request->query['ustadz_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $halaqahId = filter_var($request->query['halaqah_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if (!$profileId || !$halaqahId) {
            Response::json(['success' => false, 'message' => 'Halaqah tidak valid.'], 422);
        }
        $data = (new PublicUstadzDetailsService($pdo))->students((int) $profileId, (int) $halaqahId);
        if ($data === null) {
            Response::json(['success' => false, 'message' => 'Halaqah tidak ditemukan.'], 404);
        }
        header('Cache-Control: no-store');
        Response::json(['success' => true, 'data' => $data]);
    }

    /** Akun Mutqeen aktif bisa menambahkan role Donatur tanpa mengubah role utamanya. */
    public function activateDonor(Request $request): never
    {
        header('Cache-Control: no-store');
        $pdo = Database::connection();
        $sessions = new SessionService($pdo, new LoginValidator());
        $actor = $sessions->userFromToken(SessionService::bearerToken($request->headers));
        if ($actor === null) {
            Response::json(['success' => false, 'message' => 'Silakan masuk terlebih dahulu.'], 401);
        }

        $stmt = $pdo->prepare(
            "INSERT INTO user_roles (user_id, role, status)
             VALUES (:user_id, 'donatur', 'active')
             ON DUPLICATE KEY UPDATE status = 'active'"
        );
        $stmt->execute(['user_id' => (int) $actor['id']]);
        Response::json([
            'success' => true,
            'message' => 'Akses Donatur diaktifkan.',
            'data' => ['roles' => array_values(array_unique(array_merge($actor['roles'] ?? [], ['donatur'])))],
        ]);
    }

    public function photo(Request $request): never
    {
        $id = filter_var($request->query['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if (!$id) {
            Response::json(['success' => false, 'message' => 'Foto tidak valid.'], 422);
        }
        (new PublicUstadzDetailsService(Database::connection()))->sendPhoto((int) $id);
    }
}
