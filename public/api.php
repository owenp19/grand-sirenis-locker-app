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
function rows_movements(PDO $db, ?int $limit = 20): array {
    // Consulta por defecto limita a 20 para dashboard (performance).
    // Para exportaciones completas, usar rows_movements_all().
    $max = $limit === null ? 50000 : min(max(1, $limit), 50000);
    $q = $db->query("SELECT id, action_name AS type, locker_id AS locker,
       COALESCE(person_name,'') AS person, actor_name AS `by`, detail AS description,
       DATE_FORMAT(created_at,'%Y-%m-%dT%H:%i:%s') AS at
       FROM movements ORDER BY id DESC LIMIT " . $max);
    return $q->fetchAll();
}

function rows_movements_all(PDO $db): array {
    // Trae todos los movimientos para exportación (máx. 50000).
    $q = $db->query("SELECT id, action_name AS type, locker_id AS locker,
       COALESCE(person_name,'') AS person, actor_name AS `by`, detail AS description,
       DATE_FORMAT(created_at,'%Y-%m-%dT%H:%i:%s') AS at
       FROM movements ORDER BY id DESC LIMIT 50000");
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

function normalize_name(string $s): string {
    $s = mb_strtolower(trim((string) $s), 'UTF-8');
    if (class_exists('Normalizer')) {
        $s = Normalizer::normalize($s, Normalizer::FORM_D);
        $s = preg_replace('/\p{Mn}/u', '', $s);
    } else {
        $s = strtr($s, 'áéíóúàèìòùâêîôûäëïöüñ', 'aeiouaeiouaeiouaeioun');
    }
    return preg_replace('/\s+/', '', $s);
}
// Busca titulares reales de lockers (nunca en la tabla users). Agrupa por titular para que el
// administrador seleccione explícitamente en caso de homónimos. Nunca libera por coincidencia parcial.
function search_former_collaborators(PDO $db, string $query): array {
    $norm = normalize_name($query);
    if ($norm === '') return [];
    $q = $db->prepare("SELECT person_name, department, GROUP_CONCAT(id ORDER BY id) AS locker_ids, COUNT(*) AS locker_count FROM lockers WHERE person_name IS NOT NULL AND TRIM(person_name) <> '' AND status IN ('Asignado','Ocupado','Revisión') GROUP BY person_name, department");
    $q->execute();
    $rows = $q->fetchAll(PDO::FETCH_ASSOC);
    $out = [];
    foreach ($rows as $r) {
        $name = (string) ($r['person_name'] ?? '');
        if ($name === '' || strpos(normalize_name($name), $norm) === false) continue;
        $out[] = [
            'display_name' => $name,
            'username' => $name,
            'department' => (string) ($r['department'] ?? ''),
            'locker_ids' => array_map('intval', array_filter(explode(',', (string) ($r['locker_ids'] ?? '')))),
            'locker_count' => (int) ($r['locker_count'] ?? 0),
        ];
    }
    usort($out, fn($a, $b) => strcmp($a['display_name'], $b['display_name']));
    return array_slice($out, 0, 20);
}

function get_lockers_by_person(PDO $db, string $personName): array {
    $q = $db->prepare('SELECT id, block_no, locker_no, status, person_name, department, assigned_date FROM lockers WHERE person_name = :person ORDER BY block_no, locker_no');
    $q->execute([':person' => $personName]);
    return $q->fetchAll(PDO::FETCH_ASSOC);
}

function process_offboarding(PDO $db, array $user, array $lockerIds, string $reason, string $outcome, ?string $date, string $notes, ?string $person = null): array {
    // 1. Rol administrador leído directamente de MySQL (no confiar solo en sesión).
    $q = $db->prepare('SELECT role FROM users WHERE id = ? LIMIT 1');
    $q->execute([(int) $user['id']]);
    $role = $q->fetchColumn();
    if (!is_string($role) || $role !== 'administrador') fail('No tiene permiso para realizar esta operación.', 403);
    // 2. Sanear y validar IDs: cadenas alfanuméricas (p. ej. "1-02"), únicas, lista no vacía.
    $ids = [];
    foreach ($lockerIds as $rawId) {
        $i = (string) $rawId;
        if ($i !== '' && preg_match('/^[A-Za-z0-9.\-]{1,12}$/', $i) && !in_array($i, $ids, true)) $ids[] = $i;
    }
    if (empty($ids)) fail('No hay lockers válidos seleccionados.', 400);
    if ($reason === '') fail('Debe indicar un motivo de salida.', 400);
    $outcome = status_allowed($outcome, ['Disponible','Sin llave','Dañado','Bloqueado']);
    // 3. Iniciar transacción ANTES de bloquear los registros.
    $db->beginTransaction();
    try {
        // 4. Bloquear los registros mediante SELECT FOR UPDATE con placeholders válidos.
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $locked = $db->prepare("SELECT id, block_no, locker_no, status, person_name, department FROM lockers WHERE id IN ($placeholders) FOR UPDATE");
        $locked->execute($ids);
        $rows = $locked->fetchAll(PDO::FETCH_ASSOC);
        if (count($rows) !== count($ids)) fail('No se pudo bloquear algún locker.', 409);
        // 5. Procesar cada locker dentro de la transacción, verificando estado y titular.
        $by = $user['name'] ?? '';
        $releasedCount = 0;
        $alreadyAvailableCount = 0;
        $errorCount = 0;
        $errorLockers = [];
        $movementDescriptions = [];
        foreach ($rows as $l) {
            $lid = $l['id'];
            $actualPerson = (string) ($l['person_name'] ?? '');
            if ($l['status'] === 'Disponible') {
                $alreadyAvailableCount++;
                continue; // Ya está disponible, no procesar liberación.
            }
            if (!in_array($l['status'], ['Asignado', 'Ocupado', 'Revisión'], true)) {
                $errorLockers[] = "Locker $lid: estado {$l['status']}";
                $errorCount++;
                continue;
            }
            // Nunca liberar basándose solo en coincidencia parcial de nombre: verificar titular explícito.
            if ($person !== null && $actualPerson !== $person) {
                $errorLockers[] = "Locker $lid: titular no coincide";
                $errorCount++;
                continue;
            }
            // Registrar movimiento antes (snapshot).
            $snapshotBefore = json_encode(['status'=>$l['status'],'person_name'=>$l['person_name'],'department'=>$l['department']], JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
            // Cambiar el estado del locker a Disponible y limpiar campos del titular.
            $finalOutcome = $outcome === '' ? 'Disponible' : $outcome;
            $finalDate = $date !== null ? $date : date('Y-m-d');
            // Corregir interpolación de observaciones (concatenación explícita).
            $reasonFinal = $reason . ' (' . $finalDate . '). ' . $notes;
            $db->prepare('UPDATE lockers SET status=?, previous_owner=?, person_name=NULL, department=NULL, supervisor=NULL, assigned_date=NULL, delivered_by=NULL, reason=?, change_from=NULL, change_to=NULL, date_invalid=0 WHERE id=?')
                ->execute([$finalOutcome, $actualPerson, $reasonFinal, $lid]);
            $after = get_lock($db, $lid);
            // Movimiento de liberación (historial conservado).
            $movDetail = "$actualPerson: $reason · liberación $finalDate · $finalOutcome. Responsable: $by. $notes";
            save_movement($db, $user, 'Liberación', $lid, $actualPerson, $movDetail, ['status'=>$l['status'],'person_name'=>$l['person_name'],'department'=>$l['department']], $after);
            $releasedCount++;
            $movementDescriptions[] = $lid . ': ' . $movDetail;
        }
        // 6. Confirmar la transacción.
        $db->commit();
        $message = "Operación completada: $releasedCount lockers liberados, $alreadyAvailableCount ya estaban disponibles";
        if ($errorCount > 0) {
            $message .= ", $errorCount error(es): " . implode(', ', $errorLockers);
        }
        return ['ok'=>true, 'message'=>$message, 'released'=>$releasedCount, 'alreadyAvailable'=>$alreadyAvailableCount, 'errors'=>$errorCount, 'lockers'=>$movementDescriptions];
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        error_log('Offboarding transaction error: ' . $e->getMessage());
        fail('No se pudo completar la operación de salida. Se realizó rollback.', 500);
    }
}
function do_action(PDO $db, array $user, string $action, array $d): array {
    $db->beginTransaction();
    try {
        $by = operator_name($d, $user);
        $notes = field($d,'notes',1500);
        $certData = null;
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
            // Preparar certData para el acta
            $year = $date ? date('Y', strtotime($date)) : date('Y');
            $certData = [
                'locker_number' => $l['locker_no'],
                'block_number' => $l['block_no'],
                'student_name' => $name,
                'department' => $dept,
                'supervisor' => $supervisor,
                'assignment_year' => $year,
                'assignment_date' => $date ?? date('d/m/Y'),
                'assigned_by' => $by,
            ];
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
        if ($action === 'assign') {
            return ['ok'=>true,'message'=>$message,'certData'=>$certData];
        }
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

// Health check ultra-ligero: solo PHP + SELECT 1, sin lockers, movimientos ni datos de usuarios.
if ($method==='GET' && $resource==='health') {
    try {
        $pdo = db();
        $q = $pdo->query('SELECT 1');
        $result = $q->fetch();
        respond(['ok'=>true, 'php'=>true, 'database'=>($result !== false)]);
    } catch (Throwable $e) {
        error_log('Health check error: ' . $e->getMessage());
        respond(['ok'=>false, 'php'=>true, 'database'=>false]);
    }
}

// Perfil del usuario autenticado (lectura de sesión, sin MySQL).
if ($method==='GET' && $resource==='profile') {
    respond(['ok'=>true, 'user'=>['name'=>$user['name'], 'username'=>$user['username'], 'role'=>$isAdmin?'administrador':'operador', 'isAdmin'=>$isAdmin]]);
}

try {
    $db=db();
    // Parsear cuerpo JSON una sola vez (el frontend envía POST con application/json).
    $body = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($body)) $body = [];
    // Rutas del módulo Salida de personal: lectura y proceso, solo administradores.
    // Los parámetros viajan en query string (GET) o en el cuerpo JSON (POST).
    $offAction = (string) ($_GET['action'] ?? $body['action'] ?? '');
    if ($resource === 'offboarding' && $offAction === 'search') {
        if (!$isAdmin) fail('No tiene permiso para buscar colaboradores.', 403);
        $q = (string) ($_GET['q'] ?? $body['q'] ?? '');
        if ($q === '') respond(['ok'=>false, 'message'=>'Parámetro de búsqueda vacío.'], 400);
        $results = search_former_collaborators($db, $q);
        respond(['ok'=>true, 'results'=>$results, 'query'=>$q]);
    }
    if ($resource === 'offboarding' && $offAction === 'getLockers') {
        if (!$isAdmin) fail('No tiene permiso para consultar lockers.', 403);
        $person = (string) ($_GET['person'] ?? $body['person'] ?? '');
        if ($person === '') respond(['ok'=>false, 'message'=>'Falta el parámetro person.'], 400);
        $lockers = get_lockers_by_person($db, $person);
        respond(['ok'=>true, 'lockers'=>$lockers]);
    }
    if ($method==='GET' && $resource==='bootstrap') {
        respond(['ok'=>true,'lockers'=>rows_lockers($db),'movements'=>rows_movements($db),
            'user'=>['name'=>$user['name'],'username'=>$user['username'],'role'=>$isAdmin?'administrador':'operador','isAdmin'=>$isAdmin],
            'csrf'=>csrf_token(), 'serverTime'=>date(DATE_ATOM)]);
    }
    // Endpoint dashboard ligero: solo indicadores clave, sin descargar todos los lockers.
    if ($method==='GET' && $resource==='dashboard') {
        $db=db();
        $total = (int) $db->query('SELECT COUNT(*) FROM lockers')->fetchColumn();
        $available = (int) $db->query("SELECT COUNT(*) FROM lockers WHERE status='Disponible'")->fetchColumn();
        $assigned = (int) $db->query("SELECT COUNT(*) FROM lockers WHERE status='Asignado'")->fetchColumn();
        $warning = (int) $db->query("SELECT COUNT(*) FROM lockers WHERE status IN ('Dañado','Bloqueado','Revisión')")->fetchColumn();
        $lastMove = $db->query("SELECT id, action_name, person_name, created_at FROM movements ORDER BY id DESC LIMIT 1")->fetch();
        $lastMovement = null;
        if ($lastMove) {
            $lastMovement = [
                'id' => $lastMove['id'],
                'action' => $lastMove['action_name'],
                'person' => $lastMove['person_name'],
                'at' => $lastMove['created_at']
            ];
        }
        respond(['ok'=>true,'totalLockers'=>$total,'available'=>$available,'assigned'=>$assigned,'warning'=>$warning,'lastMovement'=>$lastMovement,'serverTime'=>date(DATE_ATOM)]);
    }
    // Endpoint certificado de asignación: PDF de dos páginas con datos de MySQL
    if ($method==='POST' && $resource==='assignment-certificate') {
        try {
            $db=db();
            // Obtener el locker asignado más reciente
            $stmt = $db->prepare("SELECT l.id AS locker_id, l.block_no, l.locker_no, l.person_name, l.department, l.supervisor, l.assigned_date FROM lockers l WHERE l.status='Asignado' ORDER BY l.id DESC LIMIT 1");
            $stmt->execute();
            $assignment = $stmt->fetch();
            if (!$assignment) { respond(['ok'=>false,'message'=>'No hay asignaciones encontradas.']); return; }
            // Obtener datos del usuario que realizó la asignación (último movimiento)
            $userStmt = $db->prepare("SELECT display_name FROM users WHERE id = ?");
            // Obtener el actor del último movimiento si existe
            $movementStmt = $db->prepare("SELECT actor_name FROM movements WHERE locker_id = ? ORDER BY id DESC LIMIT 1");
            $movementStmt->execute([$assignment['locker_id']]);
            $movement = $movementStmt->fetch();
            $actorName = $movement ? $movement['actor_name'] : 'Administrador';
            // Preparar datos para el certificado
            $year = $assignment['assigned_date'] ? date('Y', strtotime($assignment['assigned_date'])) : date('Y');
            $certData = [
                'locker_number' => $assignment['locker_no'],
                'block_number' => $assignment['block_no'],
                'student_name' => $assignment['person_name'] ?? 'No asignado',
                'department' => $assignment['department'] ?? 'No asignado',
                'supervisor' => $assignment['supervisor'] ?? 'No asignado',
                'assignment_year' => $year,
                'assignment_date' => $assignment['assigned_date'] ?? date('d/m/Y'),
                'assigned_by' => $actorName,
            ];
            respond(['ok'=>true,'certData'=>$certData,'lockerId'=>$assignment['locker_id']]);
        } catch (Throwable $e) {
            error_log('Assignment certificate error: ' . $e->getMessage());
            respond(['ok'=>false,'message'=>'Error al generar el certificado.']);
        }
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
    if (!is_array($body)) fail('Solicitud JSON inválida.',400);
    if ($method==='POST' && $resource==='profile') {
        $name=field($body,'name',120,true);
        $db->prepare('UPDATE users SET display_name=? WHERE id=?')->execute([$name,$user['id']]);
        $_SESSION['user']['name']=$name;
        respond(['ok'=>true,'message'=>'Nombre actualizado correctamente.','user'=>['name'=>$name,'username'=>$user['username'],'role'=>$isAdmin?'administrador':'operador','isAdmin'=>$isAdmin]]);
    }
    if ($method==='POST' && $resource==='profile' && isset($body['action']) && $body['action']==='change-password') {
        // Verify current password
        $currentPassword = field($body, 'current_password', 512, true);
        $newPassword = field($body, 'new_password', 512, true);
        $confirmPassword = field($body, 'confirm_password', 512, true);
        if ($newPassword !== $confirmPassword) fail('Las contraseñas nuevas no coinciden.', 400);
        // Verify current password against hash in DB
        $q = $db->prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1');
        $q->execute([(int) $user['id']]);
        $account = $q->fetch();
        if (!$account || !password_verify($currentPassword, (string) $account['password_hash'])) fail('La contraseña actual es incorrecta.', 400);
        // Generate new hash
        $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
        // Update password in DB
        $db->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([$newHash, (int) $user['id']]);
        // Revoke all previous sessions (force re-login)
        revoke_user_sessions((int) $user['id']);
        respond(['ok'=>true,'message'=>'Contraseña actualizada correctamente. Las sesiones anteriores han sido revocadas.','user'=>['name'=>$user['name'],'username'=>$user['username'],'role'=>$isAdmin?'administrador':'operador','isAdmin'=>$isAdmin]]);
    }
    if ($method==='POST' && $resource==='users' && isset($body['action']) && $body['action']==='deactivate') {
        // Only admins can deactivate users
        if (!$isAdmin) fail('No tiene permiso para desactivar usuarios.', 403);
        $targetId = (int) ($body['user_id'] ?? 0);
        if ($targetId === 0) fail('ID de usuario inválido.', 400);
        // Never deactivate the last admin
        $q = $db->prepare('SELECT role FROM users WHERE id = ? LIMIT 1');
        $q->execute([$targetId]);
        $role = $q->fetchColumn();
        if (!$role || $role !== 'administrador') fail('Usuario no encontrado o no es administrador.', 404);
        // Check if there's another admin active
        $adminCount = $db->query("SELECT COUNT(*) FROM users WHERE role='administrador' AND active=1")->fetchColumn();
        if ($adminCount <= 1 && $role === 'administrador') fail('No se puede desactivar al último administrador activo.', 403);
        // Deactivate user and revoke their sessions
        $db->prepare('UPDATE users SET active = 0 WHERE id = ?')->execute([$targetId]);
        revoke_user_sessions($targetId);
        respond(['ok'=>true,'message'=>'Usuario desactivado correctamente. Las sesiones han sido revocadas.']);
    }
    if ($method==='POST' && $resource==='offboarding' && isset($body['action']) && $body['action']==='process') {
        if (!$isAdmin) fail('No tiene permiso para realizar esta operación.', 403);
        // Normalizar lockerIds: array o string separada por comas; enteros positivos, únicos, no vacíos.
        $rawIds = $body['lockerIds'] ?? [];
        if (is_string($rawIds)) $rawIds = preg_split('/\s*,\s*/', $rawIds, -1, PREG_SPLIT_NO_EMPTY);
        if (!is_array($rawIds)) $rawIds = [];
        $person = field($body, 'person', 160);
        $reason = field($body, 'reason', 100, true);
        $notes = field($body, 'notes', 1500);
        $outcome = field($body, 'outcome', 20);
        $date = valid_date(field($body, 'date', 10), false);
        if (empty($rawIds)) fail('No hay lockers seleccionados.', 400);
        if ($reason === '') fail('Debe indicar un motivo de salida.', 400);
        $result = process_offboarding($db, $user, $rawIds, $reason, $outcome, $date, $notes, $person);
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
