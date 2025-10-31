<?php
// login.php - Login con sesión única por usuario y bloqueo por intentos fallidos

session_start();
require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';
header('Content-Type: application/json');

// --- CONFIGURACIÓN ---
define('MAX_ATTEMPTS_DEVICE', 5);
define('LOCKOUT_DURATION_MINUTES', 3);

// --- Identificación de dispositivo por cookie ---
$cookie_name = 'device_id';
$device_identifier = $_COOKIE[$cookie_name] ?? null;
if (!$device_identifier) {
    $device_identifier = bin2hex(random_bytes(32));
    setcookie($cookie_name, $device_identifier, time() + (365*24*60*60), "/");
}

// IP del cliente
$client_ip = $_SERVER['REMOTE_ADDR'];

// Solo POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

// Recibir datos
$user = trim($_POST['user'] ?? '');
$password = trim($_POST['password'] ?? '');

// --- LIMPIEZA DE INTENTOS ANTIGUOS ---
$conn->query("DELETE FROM login_attempts WHERE attempt_time < NOW() - INTERVAL 24 HOUR");

// --- Verificar bloqueo por dispositivo ---
$stmt_check = $conn->prepare(
    "SELECT COUNT(*) FROM login_attempts WHERE device_identifier = ? AND attempt_time > NOW() - INTERVAL ? MINUTE"
);
$lockout_minutes = LOCKOUT_DURATION_MINUTES;
$stmt_check->bind_param("si", $device_identifier, $lockout_minutes);
$stmt_check->execute();
$result_check = $stmt_check->get_result();
$recent_attempts = $result_check->fetch_row()[0] ?? 0;
$stmt_check->close();

if ($recent_attempts >= MAX_ATTEMPTS_DEVICE) {
    echo json_encode([
        'success' => false,
        'message' => "Dispositivo bloqueado por demasiados intentos. Intente en $lockout_minutes minutos."
    ]);
    exit;
}

// --- Validar usuario y contraseña ---
if (empty($user) || empty($password)) {
    $stmt_log = $conn->prepare("INSERT INTO login_attempts (ip_address, device_identifier, attempt_time) VALUES (?, ?, NOW())");
    $stmt_log->bind_param("ss", $client_ip, $device_identifier);
    $stmt_log->execute();
    $stmt_log->close();

    echo json_encode(['success' => false, 'message' => 'Usuario y contraseña requeridos']);
    exit;
}

// --- Obtener usuario ---
$stmt = $conn->prepare("SELECT id, password, name, rol_id FROM users WHERE user = ?");
$stmt->bind_param("s", $user);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows !== 1) {
    $stmt_log = $conn->prepare("INSERT INTO login_attempts (ip_address, device_identifier, attempt_time) VALUES (?, ?, NOW())");
    $stmt_log->bind_param("ss", $client_ip, $device_identifier);
    $stmt_log->execute();
    $stmt_log->close();

    echo json_encode(['success' => false, 'message' => 'Usuario no existente']);
    exit;
}

$row = $result->fetch_assoc();

// --- Verificar contraseña ---
if (!password_verify($password, $row['password'])) {
    $stmt_log = $conn->prepare("INSERT INTO login_attempts (ip_address, username, device_identifier, attempt_time) VALUES (?, ?, ?, NOW())");
    $stmt_log->bind_param("sss", $client_ip, $user, $device_identifier);
    $stmt_log->execute();
    $stmt_log->close();

    echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta']);
    exit;
}

// ✅ Login correcto: limpiar intentos fallidos para este dispositivo
$stmt_delete = $conn->prepare("DELETE FROM login_attempts WHERE device_identifier = ?");
$stmt_delete->bind_param("s", $device_identifier);
$stmt_delete->execute();
$stmt_delete->close();

// ✅ Generar token único y guardar en DB (una sesión activa por usuario)
$session_token = bin2hex(random_bytes(32));
$stmt_update = $conn->prepare("UPDATE users SET session_token = ? WHERE id = ?");
$stmt_update->bind_param("si", $session_token, $row['id']);
$stmt_update->execute();
$stmt_update->close();

// ✅ Guardar sesión PHP
$_SESSION['loggedin'] = true;
$_SESSION['user_id'] = $row['id'];
$_SESSION['user_name'] = $row['name'];
$_SESSION['rol_id'] = $row['rol_id'];
$_SESSION['session_token'] = $session_token;

session_write_close();

// 🔹 REDIRECCIÓN SEGÚN EL ROL
$redirect_url = "/KitchenLink/dashboard.php"; // Default
switch ($row['rol_id']) {
    case 2: // Mesero
        $redirect_url = "/KitchenLink/src/php/orders.php";
        break;
    case 3: // Cocina
        $redirect_url = "/KitchenLink/src/php/kitchen_orders.php";
        break;
    case 4: // Hostess
        $redirect_url = "/KitchenLink/src/php/reservations.php";
        break;
    case 5: // Barra
        $redirect_url = "/KitchenLink/src/php/bar_orders.php";
        break;
    case 6: // Caja
        $redirect_url = "/KitchenLink/src/php/cashier.php";
        break;
}

echo json_encode([
    'success' => true,
    'message' => 'Login correcto',
    'redirect' => $redirect_url
]);
?>
