<?php
declare(strict_types=1);

namespace App\Modules\Progress;

use App\Core\IndividualProgramStart;
use App\Modules\Auth\RegistrationException;
use PDO;

/** Progress halaqah Platform; isolated from member_progress (pondok FK required). */
final class PlatformProgressService
{
    private const DAYS = ['sabtu','ahad','senin','selasa','rabu','kamis'];

    public function __construct(private readonly PDO $pdo) {}

    private function week(int $week): void
    {
        if ($week < 1 || $week > 5) {
            throw new RegistrationException('Pekan harus 1-5.', 422);
        }
    }

    private function memberHalaqah(int $userId): int
    {
        $today=(new \DateTimeImmutable('now',new \DateTimeZone('Asia/Jakarta')))->format('Y-m-d');
        $stmt=$this->pdo->prepare(
            "SELECT h.id FROM halaqah_memberships hm
             JOIN halaqahs h ON h.id=hm.halaqah_id
               AND h.pondok_id IS NULL AND h.status='active' AND h.deleted_at IS NULL
             JOIN musyrif_profiles mp ON mp.id=h.musyrif_profile_id AND mp.status='active'
             JOIN users mentor ON mentor.id=mp.user_id AND mentor.status='active' AND mentor.deleted_at IS NULL
             WHERE hm.user_id=:uid AND hm.status='active'
               AND ((h.start_date_mode='individual' AND (hm.program_start_date IS NULL OR hm.program_start_date<=:today))
                 OR (h.start_date_mode='shared' AND h.program_start_date IS NOT NULL AND h.program_start_date<=:shared_today))
             ORDER BY hm.joined_at DESC, hm.id DESC LIMIT 1"
        );
        $stmt->execute(['uid'=>$userId,'today'=>$today,'shared_today'=>$today]);
        $id=$stmt->fetchColumn();
        if($id===false) throw new RegistrationException('Progress hanya tersedia bagi santri Halaqah Platform aktif yang sudah dapat memulai program.',403);
        return (int)$id;
    }

    private function row(int $userId,int $halaqahId,int $week,string $day): ?array
    {
        $stmt=$this->pdo->prepare(
            "SELECT id,day_code,fields,checks,completion_percent,version,client_updated_at,updated_at
             FROM platform_member_progress
             WHERE user_id=? AND halaqah_id=? AND week_no=? AND day_code=? AND deleted_at IS NULL
             LIMIT 1"
        );
        $stmt->execute([$userId,$halaqahId,$week,$day]);
        $row=$stmt->fetch(PDO::FETCH_ASSOC);
        return is_array($row)?$row:null;
    }

    private static function decoded(mixed $value): array
    {
        $v=is_string($value)?json_decode($value,true):null;
        return is_array($v)?$v:[];
    }

    private static function payload(array $row): array
    {
        return [
            'day'=>(string)$row['day_code'],
            'fields'=>self::decoded($row['fields']??null),
            'checks'=>self::decoded($row['checks']??null),
            'completion_percent'=>(int)$row['completion_percent'],
            'version'=>(int)$row['version'],
            'client_updated_at'=>$row['client_updated_at'],
            'updated_at'=>$row['updated_at'],
        ];
    }

    public function load(array $actor,int $week): array
    {
        $halaqahId=$this->memberHalaqah((int)$actor['id']);
        $this->week($week);
        $stmt=$this->pdo->prepare(
            'SELECT day_code,fields,checks,completion_percent,version,client_updated_at,updated_at
             FROM platform_member_progress
             WHERE user_id=? AND halaqah_id=? AND week_no=? AND deleted_at IS NULL'
        );
        $stmt->execute([(int)$actor['id'],$halaqahId,$week]);
        $days=[];
        foreach($stmt->fetchAll(PDO::FETCH_ASSOC) as $row){
            $days[(string)$row['day_code']]=self::payload($row);
        }
        return ['week'=>$week,'days'=>$days];
    }

    public function save(array $actor,array $input): array
    {
        $userId=(int)$actor['id'];
        $halaqahId=$this->memberHalaqah($userId);
        $week=(int)($input['week']??0);
        $day=(string)($input['day']??'');
        $this->week($week);
        if(!in_array($day,self::DAYS,true)){
            throw new RegistrationException('Hari tidak dikenal.',422);
        }
        $fields=is_array($input['fields']??null)?$input['fields']:[];
        $checks=is_array($input['checks']??null)?$input['checks']:[];
        $meaningful=false;
        foreach($fields as $value){
            if(is_scalar($value)&&trim((string)$value)!==''){$meaningful=true;break;}
        }
        if(!$meaningful)foreach($checks as $value){
            if($value===true||$value===1){$meaningful=true;break;}
        }
        $percent=max(0,min(100,(int)($input['completion_percent']??0)));
        $clientAt=trim((string)($input['client_updated_at']??''));
        if($clientAt==='')$clientAt=date('Y-m-d H:i:s').'.000';
        $version=max(0,(int)($input['version']??0));
        $old=$this->row($userId,$halaqahId,$week,$day);
        if($old!==null){
            $oldAt=(string)($old['client_updated_at']??'');
            if($oldAt!==''&&$oldAt===$clientAt)return self::payload($old);
            if($version<(int)$old['version']&&$clientAt<$oldAt){
                return self::payload($old)+['conflict'=>true];
            }
        }

        $own=!$this->pdo->inTransaction();
        if($own)$this->pdo->beginTransaction();
        else $this->pdo->exec('SAVEPOINT metodequ_platform_progress');
        try{
            $started=['program_start_date'=>null,'program_started'=>false];
            if($meaningful){
                $started=IndividualProgramStart::claim($this->pdo,$userId,$halaqahId,$week,$day);
            }
            $encodedFields=json_encode($fields,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
            $encodedChecks=json_encode($checks,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
            if($old===null){
                $insert=$this->pdo->prepare(
                    'INSERT INTO platform_member_progress
                     (user_id,halaqah_id,week_no,day_code,fields,checks,completion_percent,version,client_updated_at)
                     VALUES(?,?,?,?,?,?,?,?,?)'
                );
                $insert->execute([$userId,$halaqahId,$week,$day,$encodedFields,$encodedChecks,$percent,1,$clientAt]);
            }else{
                $update=$this->pdo->prepare(
                    'UPDATE platform_member_progress SET fields=?,checks=?,completion_percent=?,
                     version=?,client_updated_at=?,deleted_at=NULL WHERE id=?'
                );
                $update->execute([$encodedFields,$encodedChecks,$percent,(int)$old['version']+1,$clientAt,(int)$old['id']]);
            }
            $saved=$this->row($userId,$halaqahId,$week,$day);
            if($saved===null)throw new RegistrationException('Progress gagal disimpan.',500);
            if($own)$this->pdo->commit();
            else $this->pdo->exec('RELEASE SAVEPOINT metodequ_platform_progress');
            return self::payload($saved)+$started;
        }catch(\Throwable $e){
            if($this->pdo->inTransaction()){
                if($own)$this->pdo->rollBack();
                else $this->pdo->exec('ROLLBACK TO SAVEPOINT metodequ_platform_progress');
            }
            throw $e;
        }
    }

    public function forStudent(array $actor,int $userId,int $week): array
    {
        $this->week($week);
        $stmt=$this->pdo->prepare(
            "SELECT h.id FROM halaqah_memberships hm
             JOIN halaqahs h ON h.id=hm.halaqah_id
             JOIN musyrif_profiles mp ON mp.id=h.musyrif_profile_id AND mp.status='active'
             WHERE hm.user_id=:student AND hm.status='active'
             AND h.pondok_id IS NULL AND h.status='active' AND h.deleted_at IS NULL
             AND mp.user_id=:mentor
             LIMIT 1"
        );
        $stmt->execute(['student'=>$userId,'mentor'=>(int)$actor['id']]);
        $halaqahId=$stmt->fetchColumn();
        if($halaqahId===false)throw new RegistrationException('Hanya Ustadz pembimbing yang boleh melihat progres santri Platform.',403);
        $q=$this->pdo->prepare(
            'SELECT day_code,fields,checks,completion_percent,updated_at
             FROM platform_member_progress WHERE user_id=? AND halaqah_id=? AND week_no=? AND deleted_at IS NULL'
        );
        $q->execute([$userId,(int)$halaqahId,$week]);
        $days=[];
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
            $days[(string)$row['day_code']]=[
                'fields'=>self::decoded($row['fields']),
                'checks'=>self::decoded($row['checks']),
                'completion_percent'=>(int)$row['completion_percent'],
                'updated_at'=>(string)$row['updated_at'],
            ];
        }
        return ['week'=>$week,'user_id'=>$userId,'days'=>$days];
    }
}
