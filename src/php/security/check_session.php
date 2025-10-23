<?php
// File: /security/check_session.php

// Start session if not already started to read its data.
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 1. If there's no user ID, the user has never logged in.
if (!isset($_SESSION['user_id'])) {
    header('Location: /KitchenLink/index.html'); // O tu página de login
    exit;
}

// 2. Connect to the database to verify the token.
require_once $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';

// Verificación de conexión (opcional, si db_connection.php no hizo 'die')
if (!isset($conn) || $conn->connect_error) {
    // Manejo de error de DB si es necesario...
}

// 3. Get the "official" token stored in the database.
$stmt = $conn->prepare("SELECT session_token FROM users WHERE id = ?");
$stmt->bind_param("i", $_SESSION['user_id']);
$stmt->execute();
$result = $stmt->get_result();
$user_row = $result->fetch_assoc();
$stmt->close();
// ⚠️ NO CERRAMOS $conn AQUÍ, ya que se usa más adelante.

// 4. Compare the browser's session token with the one in the database.
if (!$user_row || $user_row['session_token'] !== ($_SESSION['session_token'] ?? null)) {
    
    // CASO A: SESIÓN INVÁLIDA
    
    // 💡 PASO CLAVE AÑADIDO: Borrar el token de la DB para desbloquear al usuario
    if (isset($_SESSION['user_id']) && $conn) {
        $clean_stmt = $conn->prepare("UPDATE users SET session_token = NULL WHERE id = ?");
        $clean_stmt->bind_param("i", $_SESSION['user_id']);
        $clean_stmt->execute();
        $clean_stmt->close();
    }
    
    // Destruir todos los datos de la sesión actual (lado del servidor).
    session_unset();
    session_destroy();
    
    // Cierre de la conexión (AQUÍ ES CORRECTO, porque vamos a salir)
    if (isset($conn)) {
        $conn->close();
    }

    // Redirigir el usuario a la página de login con un mensaje claro.
    header('Location: /KitchenLink/index.html?error=session_expired');
    exit;
}

// 5. Si llegamos aquí, la sesión es válida. 
// LA CONEXIÓN DEBE PERMANECER ABIERTA PARA QUE order_interface.php LA USE.
/*
if (isset($conn)) { // ⬅️ ❌ ¡ELIMINA ESTE BLOQUE! ESTO CAUSA EL ERROR.
    $conn->close();
}
*/
// Si llegamos aquí, la sesión es válida y la página puede continuar cargando.
?>