<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/private/bootstrap.php';
$user = require_login(true);
$isAdmin = is_admin();
header('Cache-Control: no-store, private');

function rows_lockers(PDO $db): array {
    $q = $db->query("SELECT id, block_no AS block, locker_no AS number, status,
      COALESCE(person_name,'') AS name, COALESCE(department,'') AS department,
      COALESCE(supervisor,'') AS supervisor, COALESCE(condition_label,'') AS `condition`,
      COALESCE(CAST(assigned_date AS CHAR),'') AS date,
      COALESCE(source_date_raw,'') AS dateRaw, date_invalid AS dateInvalid,
      COALESCE(delivered_by,'') AS deliveredBy, COALESCE(change_from,'') AS `from`,
      COALESCE(change_to,'') AS `to`, COALESCE(previous_owner,'') AS previousOwner,
      COALESCE(reason,'') AS reason, COALESCE(original_status,'') AS originalStatus,
      source_row AS sourceRow
      FROM lockers ORDER BY block_no, locker_no");
    return $q->fetchAll();
}
function rows_movements(PDO $db, ?int $limit = 500): array {
    // Tope duro para acotar memoria en exportaciones y respaldos.
    $max = $limit === null ? 50000 : min(max(1, $limit), 50000);
    $q = $db->query("SELECT id, action_name AS type, locker_id AS locker,
       COALESCE(person_name,'') AS person, actor_name AS `by`, detail AS description,
       DATE_FORMAT(created_at,'%Y-%m-%dT%H:%i:%s') AS at
       FROM movements ORDER BY id DESC LIMIT " . $max);
    return $q->fetchAll();
}
function get_lock(PDO $db, string $id): ?array {
    $q = $db->prepare('SELECT * FROM lockers WHERE id=? FOR UPDATE');
    $q->execute([$id]);
    return $q->fetch() ?: null;
}
function need_locker(?array $row, string $message = 'No encontramos ese locker.'): array {
    if (!$row) fail($message, 404);
    return $row;
}
function status_allowed(string $s, array $allowed): string {
    if (!in_array($s, $allowed, true)) fail('Selecciona un estado válido.');
    return $s;
}
function save_movement(PDO $db, array $user, string $type, string $locker, string $person, string $description, mixed $before, mixed $after): void {
    $q = $db->prepare('INSERT INTO movements (action_name,locker_id,person_name,actor_id,actor_name,detail,snapshot_before,snapshot_after) VALUES (?,?,?,?,?,?,?,?)');
    $q->execute([
        $type, $locker, $person, $user['id'], $user['name'], $description,
        json_encode($before,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE),
        json_encode($after,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE)
    ]);
}
function operator_name(array $data, array $user): string {
    // Identidad desde la sesión validada (no se confía en datos del cliente).
    // Se prefiere el nombre real del usuario almacenado en BD,
    // caído en caso de no disponerlo, pero nunca se usa el valor enviado por el cliente.
    $n = $user['name'] ?? '';
    return $n !== '' ? $n : (($user['username'] ?? ''));
}

function search_former_collaborators(PDO $db, string $query): array {
    $like = '%' . mb_strtolower($query ?? '') . '%';
    $q = $db->prepare('SELECT id, username, display_name FROM users WHERE (display_name LIKE :q OR username LIKE :q) LIMIT 20');
    $q->execute([$like]);
    return $q->fetchAll(PDO::FETCH_ASSOC);
}

function get_lockers_by_person(PDO $db, string $personName): array {
    $q = $db->prepare('SELECT id, block_no, locker_no, status, person_name, department, assigned_date FROM lockers WHERE person_name = :person ORDER BY block_no, locker_no');
    $q->execute([':person' => $personName]);
    return $q->fetchAll(PDO::FETCH_ASSOC);
}

function process_offboarding(PDO $db, array $user, array $lockerIds, string $reason, string $outcome, ?string $date, string $notes): array {
    // 1. Verificar rol administrador leyendo directamente de MySQL (no confiar solo en sesión)
    $q = $db->prepare('SELECT role FROM users WHERE id = ? LIMIT 1');
    $q->execute([(int) $user['id']]);
    $role = $q->fetchColumn();
    if (!is_string($role) || $role !== 'administrador') fail('No tiene permiso para realizar esta operación.', 403);
    // 2. Volver a consultar los registros directamente desde MySQL
    $placeholders = implode(',', array_map(fn($v) => '(?)', $lockerIds));
    $locked = $db->prepare("SELECT id, block_no, locker_no, status, person_name, department, assigned_date FROM lockers WHERE id IN ($placeholders)")->execute($lockerIds);
    $lockers = $locked->fetchAll(PDO::FETCH_ASSOC);
    if (count($lockers) !== count($lockerIds)) fail('Algunos lockers no fueron encontrados.', 404);
    // 3. Comprobar que los lockers sigan asignados a la misma persona
    $personName = '';
    foreach ($lockers as $l) {
        $p = $l['person_name'] ?? '';
        if ($personName === '') $personName = $p;
        if ($p !== $personName) {
            fail('Los lockers no pertenecen a la misma persona o ya no están asignados.', 409);
        }
    }
    // 4. Iniciar transacción
    $db->beginTransaction();
    try {
        // 5. Bloquear los registros necesarios mediante SELECT FOR UPDATE
        $placeholders2 = implode(',', array_map(fn($v) => '(?)', $lockerIds));
        $lockedIds = $db->prepare("SELECT id FROM lockers WHERE id IN ($placeholders2) FOR UPDATE")->execute($lockerIds);
        $toUpdate = $lockedIds->fetchAll(PDO::FETCH_ASSOC);
        if (count($toUpdate) !== count($lockerIds)) fail('No se pudo bloquear algún locker.', 409);
        // 6. Procesar cada locker
        $by = $user['name'];
        $releasedCount = 0;
        $alreadyAvailableCount = 0;
        $errorCount = 0;
        $errorLockers = [];
        $movementDescriptions = [];
        foreach ($toUpdate as $l) {
            $lid = $l['id'];
            // Verificar estado actual antes de liberar
            if ($l['status'] === 'Disponible') {
                $alreadyAvailableCount++;
                continue; // Ya está disponible, no procesar liberación
            }
            if (!in_array($l['status'], ['Asignado', 'Ocupado', 'Revisión'], true)) {
                $errorLockers[] = $lid . ': estado ' . $l['status'];
                $errorCount++;
                continue;
            }
            // Registrar movimiento antes (snapshot)
            $snapshotBefore = json_encode(['status'=>$l['status'],'person_name'=>$l['person_name'],'department'=>$l['department']], JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
            // 7. Cambiar el estado de los lockers seleccionados a Disponible
            $finalOutcome = $outcome === '' ? 'Disponible' : $outcome;
            $finalDate = $date !== null ? $date : date('Y-m-d');
            $reasonFinal = $reason . ' (' . $finalDate . '). $notes';
            $db->prepare('UPDATE lockers SET status=?, previous_owner=?, person_name=NULL, department=NULL, supervisor=NULL, assigned_date=NULL, delivered_by=NULL, reason=?, change_from=NULL, change_to=NULL, date_invalid=0 WHERE id=?')
                ->execute([$finalOutcome, $personName, $reasonFinal, $lid]);
            $after = get_lock($db, $lid);
            // Movimiento de liberación
            $movDetail = "$personName: $reason · liberación $finalDate · $finalOutcome. Responsable: $by. $notes";
            save_movement($db, $user, 'Liberación', $lid, $personName, $movDetail, ['status'=>$l['status'],'person_name'=>$l['person_name'],'department'=>$l['department']], $after);
            $releasedCount++;
            $movementDescriptions[] = $lid . ': ' . $movDetail;
        }
        // 8. Confirmar la transacción
        $db->commit();
        $message = "Operación completada: $releasedCount lockers liberados, $alreadyAvailableCount ya estaban disponibles";
        if ($errorCount > 0) {
            $message .= ", $errorCount error(es): " . implode(', ', $errorLockers);
        }
        return ['ok'=>true, 'message'=>$message, 'released'=>$releasedCount, 'alreadyAvailable'=>$alreadyAvailableCount, 'errors'=>$errorCount, 'lockers'=>$movementDescriptions];
    } catch (Throwable $e) {
        $db->rollBack();
        error_log('Offboarding transaction error: ' . $e->getMessage());
        fail('No se pudo completar la operación de salida. Se realizó rollback.', 500);
    }
}
function do_action(PDO $db, array $user, string $action, array $d): array {
    $db->beginTransaction();
    try {
        $by = operator_name($d, $user);
        $notes = field($d,'notes',1500);
        if ($action === 'assign') {
            $id = field($d,'locker',12);
            if ($id === 'auto') {
                $r=$db->query("SELECT * FROM lockers WHERE status='Disponible' AND (person_name IS NULL OR TRIM(person_name)='') ORDER BY block_no,locker_no LIMIT 1 FOR UPDATE");
                $l=$r->fetch();
            } else $l=get_lock($db,$id);
            $l=need_locker($l, 'No hay lockers libres para asignar.');
            if ($l['status'] !== 'Disponible' || trim((string)$l['person_name']) !== '') fail('Ese locker ya no está disponible.',409);
            $name=field($d,'name',160,true); $dept=field($d,'department',120,true);
            $supervisor=field($d,'supervisor',160);
            $condition=status_allowed(field($d,'condition',30), ['Bueno','Regular','Malo']);
            $date=valid_date(field($d,'date',10,true),true);
            $sql='UPDATE lockers SET status=?,person_name=?,department=?,supervisor=?,condition_label=?,assigned_date=?,delivered_by=?,reason=?,change_from=NULL,change_to=NULL,date_invalid=0 WHERE id=?';
            $db->prepare($sql)->execute(['Asignado',$name,$dept,$supervisor,$condition,$date,$by,$notes,$l['id']]);
            $after=get_lock($db,$l['id']);
            save_movement($db,$user,'Asignación',$l['id'],$name,"Entregado a $name ($dept) por $by. $notes",$l,$after);
            $message="Locker {$l['id']} asignado correctamente.";
        } elseif ($action === 'release') {
            $id=field($d,'locker',12,true); $l=need_locker(get_lock($db,$id));
            if ($l['status']!=='Asignado') fail('Este locker ya no está asignado.',409);
            $reason=status_allowed(field($d,'reason',40,true), ['Salida del hotel','Renuncia','Fin de contrato','Cambio de locker','Otro']);
            $outcome=status_allowed(field($d,'outcome',20,true), ['Disponible','Sin llave','Dañado','Bloqueado']);
            $date=valid_date(field($d,'date',10,true),true);
            $name=(string) $l['person_name'];
            $db->prepare("UPDATE lockers SET status=?,previous_owner=?,person_name=NULL,department=NULL,supervisor=NULL,condition_label=NULL,assigned_date=NULL,delivered_by=NULL,reason=?,change_from=NULL,change_to=NULL,date_invalid=0 WHERE id=?")
                ->execute([$outcome,$name,"$reason ($date). $notes",$id]);
            $after=get_lock($db,$id);
            save_movement($db,$user,'Liberación',$id,$name,"$name: $reason · devolución $date · $outcome. Responsable: $by. $notes",$l,$after);
            $message="Locker $id liberado. Estado final: $outcome.";
        } elseif ($action === 'transfer') {
            $src=field($d,'source',12,true); $dst=field($d,'target',12,true);
            if ($src===$dst) fail('Selecciona dos lockers diferentes.');
            // Bloqueo ordenado para reducir interbloqueos al trabajar con varios usuarios.
            $ids=[$src,$dst];sort($ids,SORT_STRING);
            $a=get_lock($db,$ids[0]);$b=get_lock($db,$ids[1]);
            $rows=[$ids[0]=>$a,$ids[1]=>$b];$from=need_locker($rows[$src]);$to=need_locker($rows[$dst]);
            if ($from['status']!=='Asignado' || $to['status']!=='Disponible' || trim((string)$to['person_name'])!=='') fail('Verifica que el origen esté asignado y el destino libre.',409);
            $outcome=status_allowed(field($d,'oldOutcome',20,true), ['Disponible','Sin llave','Dañado','Bloqueado']);
            $date=valid_date(field($d,'date',10,true),true);
            $person=(string)$from['person_name'];
            $db->prepare("UPDATE lockers SET status='Asignado',person_name=?,department=?,supervisor=?,condition_label=?,assigned_date=?,delivered_by=?,previous_owner=?,change_from=?,change_to=?,reason=?,date_invalid=0 WHERE id=?")
                ->execute([$person,$from['department'],$from['supervisor'],$from['condition_label'],$date,$by,$to['person_name']?:$to['previous_owner'],$src,$dst,$notes,$dst]);
            $db->prepare("UPDATE lockers SET status=?,previous_owner=?,person_name=NULL,department=NULL,supervisor=NULL,condition_label=NULL,assigned_date=NULL,delivered_by=NULL,change_from=NULL,change_to=?,reason=?,date_invalid=0 WHERE id=?")
                ->execute([$outcome,$person,$dst,"Traslado a $dst. $notes",$src]);
            $after=['source'=>get_lock($db,$src),'target'=>get_lock($db,$dst)];
            save_movement($db,$user,'Traslado',"$src → $dst",$person,"$person pasó de $src a $dst. Origen: $outcome. Gestionó: $by. $notes",['source'=>$from,'target'=>$to],$after);
            $message="Traslado de $src a $dst registrado.";
        } elseif ($action === 'status') {
            $id=field($d,'locker',12,true); $l=need_locker(get_lock($db,$id));
            if ($l['status']==='Asignado') fail('Primero libera el locker asignado.',409);
            $new=status_allowed(field($d,'status',20,true), ['Disponible','Sin llave','Dañado','Bloqueado','Ocupado','Revisión']);
            if (trim((string)$l['person_name'])!=='' && $new==='Disponible') fail('Hay un nombre registrado. Usa Revisar incidencia para validar el dato.',409);
            if ($notes==='') fail('Describe el motivo del cambio.');
            $db->prepare('UPDATE lockers SET status=?,reason=? WHERE id=?')->execute([$new,$notes,$id]);
            $after=get_lock($db,$id);
            save_movement($db,$user,'Estado físico',$id,(string)$l['person_name'],"{$l['status']} → $new. Responsable: $by. $notes",$l,$after);
            $message="Estado de $id actualizado a $new.";
        } elseif ($action === 'edit') {
            $id=field($d,'locker',12,true); $l=need_locker(get_lock($db,$id));
            if ($l['status']!=='Asignado') fail('Solo se editan asignaciones activas.',409);
            $name=field($d,'name',160,true);$dept=field($d,'department',120,true);$sup=field($d,'supervisor',160);
            $cond=status_allowed(field($d,'condition',30,true), ['Bueno','Regular','Malo']);
            $date=valid_date(field($d,'date',10,true),true);
            if ($notes==='') fail('Escribe la razón de la corrección para auditoría.');
            $db->prepare('UPDATE lockers SET person_name=?,department=?,supervisor=?,condition_label=?,assigned_date=?,date_invalid=0 WHERE id=?')
               ->execute([$name,$dept,$sup,$cond,$date,$id]);
            $after=get_lock($db,$id);
            save_movement($db,$user,'Corrección',$id,$name,"Datos corregidos por $by. Titular anterior: {$l['person_name']}. $notes",$l,$after);
            $message="Datos del locker $id actualizados.";
        } elseif ($action === 'reconcile') {
            $id=field($d,'locker',12,true); $l=need_locker(get_lock($db,$id));
            if ($l['status']==='Asignado') fail('Para corregir una asignación utiliza Editar.',409);
            $new=status_allowed(field($d,'status',20,true), ['Disponible','Asignado','Sin llave','Dañado','Bloqueado','Ocupado','Revisión']);
            if ($notes==='') fail('La revisión debe incluir una justificación.');
            if ($new==='Asignado') {
                $name=(string)$l['person_name'];
                if ($name==='' || strtolower(trim($name))==='ocupado') fail('No hay un nombre verificable para asignar. Registra una asignación nueva cuando esté disponible.');
                $date = $l['assigned_date'] ?: null;
                if (!$date || (int)$l['date_invalid']===1) fail('La fecha del titular no está validada. Corrige con soporte antes de activar.');
                $db->prepare('UPDATE lockers SET status=?,reason=? WHERE id=?')->execute([$new,$notes,$id]);
            } else {
                $db->prepare('UPDATE lockers SET status=?,previous_owner=COALESCE(NULLIF(person_name,\'\'),previous_owner),person_name=NULL,department=NULL,supervisor=NULL,condition_label=NULL,assigned_date=NULL,delivered_by=NULL,date_invalid=0,reason=? WHERE id=?')
                    ->execute([$new,$notes,$id]);
            }
            $after=get_lock($db,$id);
            save_movement($db,$user,'Validación',$id,(string)$l['person_name'],"{$l['status']} → $new. Validó: $by. $notes",$l,$after);
            $message="Verificación de $id guardada.";
        } else fail('Operación desconocida.',404);
        $db->commit();
        return ['ok'=>true,'message'=>$message];
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}
function csv_output(string $name, array $headers, array $rows): never {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $name . '"');
    echo "\xEF\xBB\xBF";
    $out=fopen('php://output','w'); fputcsv($out,$headers,';','"','');
    foreach($rows as $row) {
        $v=array_map(static function($s){
            $s=(string)($s??'');
            if (preg_match('/^[=+@\-\t\r]/u',$s)) $s="'".$s;
            return $s;
        },array_values($row));
        fputcsv($out,$v,';','"','');
    }
    fclose($out);exit;
}
$method=$_SERVER['REQUEST_METHOD'] ?? 'GET';
$resource=(string) ($_GET['resource'] ?? 'bootstrap');

// Endpoint ligero de disponibilidad: solo PHP + sesión, sin MySQL.
// Permite distinguir entre servidor PHP caído y MySQL caído.
if ($method==='GET' && $resource==='ping') {
    respond(['ok'=>true, 'serverTime'=>date(DATE_ATOM)]);
}

// Perfil del usuario autenticado (lectura de sesión, sin MySQL).
if ($method==='GET' && $resource==='profile') {
    respond(['ok'=>true, 'user'=>['name'=>$user['name'], 'username'=>$user['username'], 'role'=>$isAdmin?'administrador':'operador', 'isAdmin'=>$isAdmin]]);
}
// Búsqueda de antiguos colaboradores (solo GET, solo lectura).
if ($method==='GET' && $resource==='offboarding' && $_GET['action']==='search') {
    $q = $_GET['q'] ?? '';
    if ($q === '') respond(['ok'=>false, 'message'=>'Parámetro de búsqueda vacío.'], 400);
    $results = search_former_collaborators($db, $q);
    respond(['ok'=>true, 'results'=>$results, 'query'=>$q]);
}
if ($method==='GET' && $resource==='offboarding' && $_GET['action']==='getLockers') {
    $person = $_GET['person'] ?? '';
    if ($person === '') respond(['ok'=>false, 'message'=>'Falta el parámetro person.'], 400);
    $lockers = get_lockers_by_person($db, $person);
    respond(['ok'=>true, 'lockers'=>$lockers]);
}

try {
    $db=db();
    if ($method==='GET' && $resource==='bootstrap') {
        respond(['ok'=>true,'lockers'=>rows_lockers($db),'movements'=>rows_movements($db),
            'user'=>['name'=>$user['name'],'username'=>$user['username'],'role'=>$isAdmin?'administrador':'operador','isAdmin'=>$isAdmin],
            'csrf'=>csrf_token(), 'serverTime'=>date(DATE_ATOM)]);
    }
    if ($method==='GET' && $resource==='export') {
        $type=(string)($_GET['type']??'');$now=date('Y-m-d_H-i');
        if ($type==='inventory') {
            // Solo administradores pueden exportar inventario completo.
            if (!$isAdmin) fail('No tiene permiso para exportar el inventario.', 403);
            $raw=rows_lockers($db);$keys=['id','block','status','name','department','supervisor','condition','date','dateRaw','deliveredBy','previousOwner','from','to','reason','originalStatus','sourceRow'];
            $rows=array_map(static fn($r)=>array_map(static fn($k)=>$r[$k]??'', $keys),$raw);
            csv_output("lockers_inventario_$now.csv",['Locker','Bloque','Estado','Colaborador','Departamento','Jefe','Condición','Fecha entrega','Fecha origen','Entregado por','Antiguo titular','Traslado desde','Traslado hacia','Observaciones','Estado origen','Fila Excel'],$rows);
        }
        if ($type==='history') {
            // Solo administradores pueden exportar historial completo.
            if (!$isAdmin) fail('No tiene permiso para exportar el historial.', 403);
            $rows=rows_movements($db,null);
            csv_output("lockers_movimientos_$now.csv",['ID','Acción','Locker','Colaborador','Responsable','Detalle','Fecha'],array_map(static fn($r)=>[$r['id'],$r['type'],$r['locker'],$r['person'],$r['by'],$r['description'],$r['at']],$rows));
        }
        if ($type==='backup') {
            // El respaldo completo incluye datos personales de todos los lockers: solo administradores.
            if (!$isAdmin) fail('Solo un administrador puede descargar el respaldo completo.', 403);
            header('Content-Type: application/json; charset=utf-8');
            header('Content-Disposition: attachment; filename="lockers_respaldo_'.$now.'.json"');
            $movements = rows_movements($db, null);
            $totalMovements = (int) $db->query('SELECT COUNT(*) FROM movements')->fetchColumn();
            echo json_encode([
                'exportedAt' => date(DATE_ATOM),
                'lockers' => rows_lockers($db),
                'movements' => $movements,
                // Metadatos de transparencia: si la bitácora supera el tope, se indica.
                'movementsTotal' => $totalMovements,
                'movementsLimit' => 50000,
                'movementsTruncated' => $totalMovements > count($movements),
            ], JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_INVALID_UTF8_SUBSTITUTE);
            exit;
        }
        fail('Exportación no reconocida.',404);
    }
    if ($method!=='POST') fail('Ruta no permitida.',405);
    if (!csrf_valid((string)($_SERVER['HTTP_X_CSRF_TOKEN']??''))) fail('Sesión del formulario vencida. Recarga la página.',403);
    if ((int)($_SERVER['CONTENT_LENGTH']??0)>20000) fail('Formulario demasiado grande.',413);
    $body=json_decode((string)file_get_contents('php://input'),true);
    if (!is_array($body)) fail('Solicitud JSON inválida.',400);
    if ($method==='POST' && $resource==='profile') {
        $name=field($body,'name',120,true);
        $db->prepare('UPDATE users SET display_name=? WHERE id=?')->execute([$name,$user['id']]);
        $_SESSION['user']['name']=$name;
        respond(['ok'=>true,'message'=>'Nombre actualizado correctamente.','user'=>['name'=>$name,'username'=>$user['username'],'role'=>$isAdmin?'administrador':'operador','isAdmin'=>$isAdmin]]);
    }
    if ($method==='POST' && $resource==='offboarding' && isset($body['action']) && $body['action']==='process') {
        if (!$isAdmin) fail('No tiene permiso para realizar esta operación.', 403);
        $lockerIds = $body['lockerIds'] ?? [];
        $reason = field($body, 'reason', 100, true);
        $notes = field($body, 'notes', 1500);
        $outcome = field($body, 'outcome', 20);
        $date = valid_date(field($body, 'date', 10), false);
        if (empty($lockerIds)) fail('No hay lockers seleccionados.', 400);
        if ($reason === '') fail('Debe indicar un motivo de salida.', 400);
        $result = process_offboarding($db, $user, $lockerIds, $reason, $outcome, $date, $notes);
        respond($result);
    }
    respond(do_action($db,$user,$resource,$body));
} catch (PDOException $e) {
    error_log('LockerFlow PDO: '.$e->getMessage());
    if ($e->getCode()==='40001' || in_array((int)($e->errorInfo[1]??0),[1205,1213],true)) fail('Otro usuario modificó un locker al mismo tiempo. Intenta de nuevo.',409);
    fail('No se pudo completar la operación en MySQL. Revisa la conexión y vuelve a intentar.',503);
} catch (Throwable $e) {
    error_log('LockerFlow API: '.$e->getMessage());
    fail('No fue posible completar el cambio. Inténtalo de nuevo.',500);
}
