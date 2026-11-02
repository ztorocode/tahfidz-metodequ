<?php

declare(strict_types=1);

namespace App\Modules\Users;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\LoginValidator;
use App\Modules\Auth\RegistrationException;
use App\Modules\Auth\SessionService;

final class StudentHalaqahCatalogController
{
    /** @return array<string,mixed> */
    private function actor(Request $request): array
    {
        $db=Database::connection();
        $session=new SessionService($db,new LoginValidator());
        $user=$session->userFromToken(SessionService::bearerToken($request->headers));
        if($user===null)Response::json(['success'=>false,'message'=>'Login diperlukan.'],401);
        return $user;
    }

    private function service():StudentHalaqahCatalogService
    {
        return new StudentHalaqahCatalogService(Database::connection());
    }

    public function catalog(Request $request):never
    {
        $actor=$this->actor($request);
        if(!in_array('member',$actor['roles']??[],true))Response::json(['success'=>false,'message'=>'Khusus Santri.'],403);
        header('Cache-Control: private, no-store');
        Response::json(['success'=>true,'data'=>$this->service()->catalog((int)$actor['id'])]);
    }

    public function apply(Request $request):never
    {
        try{
            $actor=$this->actor($request);
            if(!in_array('member',$actor['roles']??[],true))throw new RegistrationException('Khusus Santri.',403);
            $result=$this->service()->apply((int)$actor['id'],(int)($request->body()['halaqah_id']??0));
            Response::json(['success'=>true,'message'=>'Pendaftaran dikirim. Menunggu persetujuan Ustadz.','data'=>$result],201);
        }catch(RegistrationException $e){
            Response::json(['success'=>false,'message'=>$e->getMessage()],$e->statusCode);
        }
    }

    public function applications(Request $request):never
    {
        $actor=$this->actor($request);
        if(!array_intersect($actor['roles']??[],['musyrif','admin']))Response::json(['success'=>false,'message'=>'Akses ditolak.'],403);
        header('Cache-Control: private, no-store');
        Response::json(['success'=>true,'data'=>$this->service()->applications($actor)]);
    }

    public function review(Request $request):never
    {
        try{
            $actor=$this->actor($request);
            if(!array_intersect($actor['roles']??[],['musyrif','admin']))throw new RegistrationException('Akses ditolak.',403);
            $input=$request->body();
            $result=$this->service()->review($actor,(int)($input['application_id']??0),(string)($input['decision']??''));
            Response::json(['success'=>true,'message'=>'Pendaftaran berhasil diproses.','data'=>$result]);
        }catch(RegistrationException $e){
            Response::json(['success'=>false,'message'=>$e->getMessage()],$e->statusCode);
        }
    }
}
