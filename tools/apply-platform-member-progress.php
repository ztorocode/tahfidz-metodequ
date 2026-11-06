<?php
declare(strict_types=1);

use App\Core\Database;
use App\Core\Env;

$root=dirname(__DIR__);
$backend=$root.'/src/backend';
require_once $backend.'/app/Core/Env.php';
require_once $backend.'/app/Core/Database.php';
Env::load($backend.'/.env', override: true, required: true);
$pdo=Database::connection();
$file=$backend.'/database/migrations/20261106_026_platform_member_progress.php';
$migration=require $file;
$lock='metodequ_schema_migration';
$acquire=$pdo->prepare('SELECT GET_LOCK(?, 30)');
$acquire->execute([$lock]);
if((int)$acquire->fetchColumn()!==1)throw new RuntimeException('Schema lock tidak tersedia');
try{
    $checksum=hash_file('sha256',$file);
    $q=$pdo->prepare('SELECT checksum FROM schema_migrations WHERE migration_id=?');
    $q->execute([$migration['id']]);
    $current=$q->fetchColumn();
    if($current!==false&&!hash_equals((string)$current,$checksum)){
        throw new RuntimeException('Checksum migrasi berbeda');
    }
    $pdo->exec($migration['up'][0]);
    $verify=$pdo->query(
        "SELECT COUNT(*) FROM information_schema.key_column_usage
         WHERE table_schema=DATABASE() AND table_name='platform_member_progress'
         AND constraint_name='uq_platform_member_progress_day'"
    )->fetchColumn();
    if((int)$verify!==4)throw new RuntimeException('Unique key tidak cocok');
    if($current===false){
        $insert=$pdo->prepare('INSERT INTO schema_migrations (migration_id,description,checksum) VALUES(?,?,?)');
        $insert->execute([$migration['id'],$migration['description'],$checksum]);
    }
    echo "MIGRATION_026=PASS\n";
}finally{
    $release=$pdo->prepare('SELECT RELEASE_LOCK(?)');
    $release->execute([$lock]);
}
