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
}
