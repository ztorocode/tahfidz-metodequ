<?php

declare(strict_types=1);

namespace App\Modules\PublicDonations;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;

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

    public function photo(Request $request): never
    {
        $id = filter_var($request->query['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if (!$id) {
            Response::json(['success' => false, 'message' => 'Foto tidak valid.'], 422);
        }
        (new PublicUstadzDetailsService(Database::connection()))->sendPhoto((int) $id);
    }
}
