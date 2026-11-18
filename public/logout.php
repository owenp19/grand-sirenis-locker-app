<?php
require_once dirname(__DIR__) . '/private/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !csrf_valid((string) ($_POST['csrf'] ?? ''))) { http_response_code(403); exit('Operación rechazada.'); }
$_SESSION = [];
session_regenerate_id(true);
header('Location: login.php');
exit;
