<?php
// File: /security/check_session.php - UNIVERSAL PARA TODOS LOS ROLES

// Start session if not already started to read its data.
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 1. Si no hay ID de usuario, redirige inmediatamente a login.
if (!isset($_SESSION['user_id'])) {
    header('Location: /KitchenLink/index.php'); 
    exit;
}

// 2. Conexión a la base de datos
require_once $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';

// Verificación de conexión (opcional)
if (!isset($conn) || $conn->connect_error) {
    // Manejo de error
}

// 3. Obtener el token Y el rol_id de la base de datos.
// Esto es CRUCIAL: Traemos el rol para usarlo después.
$stmt = $conn->prepare("SELECT session_token, rol_id FROM users WHERE id = ?");
$stmt->bind_param("i", $_SESSION['user_id']);
$stmt->execute();
$result = $stmt->get_result();
$user_row = $result->fetch_assoc();
$stmt->close();
// NO CERRAMOS $conn AQUÍ.

// 4. Verificación de Token (La lógica de seguridad)
if (!$user_row || $user_row['session_token'] !== ($_SESSION['session_token'] ?? null)) {
    
    // Si el token es inválido, borra el token de la DB y redirige.
    if (isset($_SESSION['user_id']) && $conn) {
        $clean_stmt = $conn->prepare("UPDATE users SET session_token = NULL WHERE id = ?");
        $clean_stmt->bind_param("i", $_SESSION['user_id']);
        $clean_stmt->execute();
        $clean_stmt->close();
    }
    
    session_unset();
    session_destroy();
    
    if (isset($conn)) {
        $conn->close();
    }

    header('Location: /KitchenLink/index.php?error=session_expired');
    exit;
}

// 5. 🔑 CLAVE: Almacena el rol_id en la sesión para que el script principal lo use.
$_SESSION['rol_id'] = $user_row['rol_id'];

// ⚠️ ELIMINAMOS TODA LA LÓGICA DE 'IF ($_SESSION['rol_id'] != MESERO_ROLE_ID)'

// 6. Si la ejecución llega aquí, la sesión es válida, el token es correcto y $_SESSION['rol_id']
// contiene el rol del usuario (1, 2, 3, etc.).
?>