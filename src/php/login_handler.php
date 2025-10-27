<?php
// Lógica de la interfaz de login (Bloqueo por Dispositivo con Cookies)

session_start();
date_default_timezone_set('America/Mexico_City');
require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php'; 

header('Content-Type: application/json');

// --- Definiciones de Rate Limiting ---
define('MAX_ATTEMPTS_DEVICE', 5); // Límite de intentos por dispositivo
define('LOCKOUT_DURATION_MINUTES', 3); // Tiempo de bloqueo en minutos (ej. 60 minutos)

// 🔑 DEFINICIÓN DE LA FUNCIÓN DE IP
function getClientIp() {
    $ip = $_SERVER['REMOTE_ADDR'];
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
    }
    return substr($ip, 0, 45); 
}

$client_ip = getClientIp();

// --- GESTIÓN DE LA COOKIE DE DISPOSITIVO ---
$cookie_name = 'device_id';
$device_identifier = $_COOKIE[$cookie_name] ?? null;

if (!$device_identifier) {
    $device_identifier = bin2hex(random_bytes(32));
    setcookie($cookie_name, $device_identifier, time() + (365 * 24 * 60 * 60), "/");
}

// =================================================================
// NUEVO: LIMPIEZA AUTOMÁTICA DE REGISTROS ANTIGUOS
// =================================================================
// Borra los intentos de login que tengan más de 24 horas para mantener la tabla limpia.
try {
    $conn->query("DELETE FROM login_attempts WHERE attempt_time < NOW() - INTERVAL 24 HOUR");
} catch (Exception $e) {
    // No es un error crítico, así que no detenemos el script si falla.
}


if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $user = trim($_POST['user'] ?? '');
    $password = trim($_POST['password'] ?? '');

    // =================================================================
    // CORREGIDO: VERIFICACIÓN DE BLOQUEO
    // =================================================================
    // Ahora MySQL calcula el tiempo, lo que es más preciso y evita problemas de zona horaria.
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
            "success" => false, 
            "message" => "Dispositivo bloqueado por demasiados intentos. Intente de nuevo en " . LOCKOUT_DURATION_MINUTES . " minutos."
        ]);
        $conn->close();
        exit;
    }

    // 2. LÓGICA DE LOGIN (restante, sin cambios funcionales)
    if (empty($user) || empty($password)) {
        $stmt_log = $conn->prepare("INSERT INTO login_attempts (ip_address, device_identifier, attempt_time) VALUES (?, ?, NOW())");
        $stmt_log->bind_param("ss", $client_ip, $device_identifier);
        $stmt_log->execute();
        $stmt_log->close();
        
        echo json_encode(["success" => false, "message" => "Faltó ingresar usuario y/o contraseña."]);
        $conn->close();
        exit;
    }

    // Consulta de usuario
    $stmt = $conn->prepare("SELECT id, password, name, rol_id, session_token FROM users WHERE user = ?");
    $stmt->bind_param("s", $user);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result && $result->num_rows === 1) {
        $row = $result->fetch_assoc();
        
        if (password_verify($password, $row['password'])) {
            // Limpieza de intentos fallidos en caso de éxito
            $stmt_delete = $conn->prepare("DELETE FROM login_attempts WHERE device_identifier = ?");
            $stmt_delete->bind_param("s", $device_identifier);
            $stmt_delete->execute();
            $stmt_delete->close();
            
            // Generar nuevo token y establecer sesión
            $session_token = bin2hex(random_bytes(32));
            $stmt_update = $conn->prepare("UPDATE users SET session_token = ? WHERE id = ?");
            $stmt_update->bind_param("si", $session_token, $row['id']);
            $stmt_update->execute();
            $stmt_update->close();

            $_SESSION['loggedin'] = true;
            $_SESSION['user_id'] = $row['id'];
            $_SESSION['user_name'] = $row['name'];
            $_SESSION['rol_id'] = $row['rol_id'];
            $_SESSION['session_token'] = $session_token;
            
            // Lógica de redirección
            $redirect_url = "/KitchenLink/dashboard.php"; 
            switch ($row['rol_id']) {
                case 4: $redirect_url = "/KitchenLink/src/php/reservations.php"; break;
                case 2: $redirect_url = "/KitchenLink/src/php/orders.php"; break;
                case 3: $redirect_url = "/KitchenLink/src/php/kitchen_orders.php"; break;
                case 5: $redirect_url = "/KitchenLink/src/php/bar_orders.php"; break;
                case 6: $redirect_url = "/KitchenLink/src/php/cashier.php"; break;
            }

            echo json_encode(["success" => true, "redirect" => $redirect_url]);

        } else {
            // Registrar intento fallido (Contraseña incorrecta)
            $stmt_log = $conn->prepare("INSERT INTO login_attempts (ip_address, username, device_identifier, attempt_time) VALUES (?, ?, ?, NOW())");
            $stmt_log->bind_param("sss", $client_ip, $user, $device_identifier);
            $stmt_log->execute();
            $stmt_log->close();
            
            echo json_encode(["success" => false, "message" => "Contraseña incorrecta."]);
        }
    } else {
        // Registrar intento fallido (Usuario no encontrado)
        $stmt_log = $conn->prepare("INSERT INTO login_attempts (ip_address, device_identifier, attempt_time) VALUES (?, ?, NOW())");
        $stmt_log->bind_param("ss", $client_ip, $device_identifier);
        $stmt_log->execute();
        $stmt_log->close();
        
        echo json_encode(["success" => false, "message" => "Usuario no existente."]);
    }

    $conn->close();
}
exit;
?>