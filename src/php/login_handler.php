<?php
// Lógica de la interfaz de login (Bloqueo por Dispositivo con Cookies)

session_start();
date_default_timezone_set('America/Mexico_City');
require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php'; 

header('Content-Type: application/json');

// --- Definiciones de Rate Limiting ---
define('MAX_ATTEMPTS_DEVICE', 5); // Límite de intentos por dispositivo
define('TIME_WINDOW_MINUTES', 15);

// 🔑 DEFINICIÓN DE LA FUNCIÓN DE IP
function getClientIp() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
    } else {
        $ip = $_SERVER['REMOTE_ADDR'];
    }
    return substr($ip, 0, 45); 
}

$client_ip = getClientIp();

// --- GESTIÓN DE LA COOKIE DE DISPOSITIVO ---
$cookie_name = 'device_id';
$device_identifier = $_COOKIE[$cookie_name] ?? null;

// Si el dispositivo no tiene una cookie, se la creamos
if (!$device_identifier) {
    $device_identifier = bin2hex(random_bytes(32)); // Genera un ID único
    // La cookie expira en 1 año y es accesible en todo el sitio ("/")
    setcookie($cookie_name, $device_identifier, time() + (365 * 24 * 60 * 60), "/");
}


if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $user = trim($_POST['user'] ?? '');
    $password = trim($_POST['password'] ?? '');

    // 1. 🔑 VERIFICACIÓN DE BLOQUEO (MODIFICADO para usar el device_identifier)
    $cutoff_time = new DateTime();
    $cutoff_time->modify('-' . TIME_WINDOW_MINUTES . ' minutes');
    $cutoff_time_str = $cutoff_time->format('Y-m-d H:i:s');
    
    // Contar intentos fallidos para ESTE dispositivo
    $stmt_check = $conn->prepare("SELECT COUNT(*) FROM login_attempts WHERE device_identifier = ? AND attempt_time > ?");
    $stmt_check->bind_param("ss", $device_identifier, $cutoff_time_str);
    $stmt_check->execute();
    
    $result_check = $stmt_check->get_result();
    $recent_attempts = $result_check->fetch_row()[0] ?? 0;
    $stmt_check->close();

    if ($recent_attempts >= MAX_ATTEMPTS_DEVICE) {
        echo json_encode([
            "success" => false, 
            "message" => "Dispositivo bloqueado por demasiados intentos. Intente de nuevo en " . TIME_WINDOW_MINUTES . " minutos."
        ]);
        $conn->close();
        exit;
    }

    // 2. LÓGICA DE LOGIN (restante)
    if (empty($user) || empty($password)) {
        // MODIFICADO: Registrar intento con device_identifier
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
        $hashed_password = $row['password'];

        if (password_verify($password, $hashed_password)) {
            
            // 3. LIMPIEZA DE TOKEN FANTASMA
            if (!empty($row['session_token'])) {
                $stmt_clear = $conn->prepare("UPDATE users SET session_token = NULL WHERE id = ?");
                $stmt_clear->bind_param("i", $row['id']);
                $stmt_clear->execute();
                $stmt_clear->close();
            }

            // 4. LIMPIEZA DE INTENTOS FALLIDOS EN CASO DE ÉXITO
            // MODIFICADO: Limpiar intentos para este dispositivo
            $stmt_delete = $conn->prepare("DELETE FROM login_attempts WHERE device_identifier = ?");
            $stmt_delete->bind_param("s", $device_identifier);
            $stmt_delete->execute();
            $stmt_delete->close();
            
            // 5. Generar nuevo token y establecer sesión
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
            
            // 6. Lógica de redirección
            $redirect_url = "/KitchenLink/dashboard.php"; 
            switch ($row['rol_id']) {
                case 4: $redirect_url = "/KitchenLink/src/php/reservations.php"; break;
                case 2: $redirect_url = "/KitchenLink/src/php/orders.php"; break;
                case 3: $redirect_url = "/KitchenLink/src/php/kitchen_orders.php"; break;
                case 5: $redirect_url = "/KitchenLink/src/php/bar_orders.php"; break;
            }

            echo json_encode(["success" => true, "redirect" => $redirect_url]);

        } else {
            // 7. REGISTRAR INTENTO FALLIDO (Contraseña incorrecta)
            // MODIFICADO: Registrar con device_identifier
            $stmt_log = $conn->prepare("INSERT INTO login_attempts (ip_address, username, device_identifier, attempt_time) VALUES (?, ?, ?, NOW())");
            $stmt_log->bind_param("sss", $client_ip, $user, $device_identifier);
            $stmt_log->execute();
            $stmt_log->close();
            
            echo json_encode(["success" => false, "message" => "Contraseña incorrecta."]);
        }
    } else {
        // 7. REGISTRAR INTENTO FALLIDO (Usuario no encontrado)
        // MODIFICADO: Registrar con device_identifier
        $stmt_log = $conn->prepare("INSERT INTO login_attempts (ip_address, device_identifier, attempt_time) VALUES (?, ?, NOW())");
        $stmt_log->bind_param("ss", $client_ip, $device_identifier);
        $stmt_log->execute();
        $stmt_log->close();
        
        echo json_encode(["success" => false, "message" => "Usuario no existente."]);
    }

    $conn->close();
}
exit;