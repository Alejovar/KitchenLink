<?php
// File: /security/check_session_api.php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 1. If there's no session, send a 401 Unauthorized error and exit.
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No active session.']);
    exit;
}

// 2. Incluye la conexión (que ahora se abre si no existe, o usa la existente)
require_once $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';

// Verificación de conexión por si el archivo de conexión hizo 'die'
if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server database connection error.']);
    exit;
}

$stmt = $conn->prepare("SELECT session_token FROM users WHERE id = ?");
$stmt->bind_param("i", $_SESSION['user_id']);
$stmt->execute();
$result = $stmt->get_result();
$user_row = $result->fetch_assoc();
$stmt->close();

// 3. If the token doesn't match, it's an invalid session.
// ⚠️ Nota: Usamos ( $_SESSION['session_token'] ?? null ) para evitar un Notice si la variable no existe
if (!$user_row || $user_row['session_token'] !== ($_SESSION['session_token'] ?? null)) {
    
    // 🔑 CAMBIO CRUCIAL: Borrar el token de la DB para desbloquear al usuario
    // Si la sesión PHP falla, limpiamos la DB para permitir un nuevo inicio de sesión.
    if (isset($_SESSION['user_id']) && $conn) {
        $clean_stmt = $conn->prepare("UPDATE users SET session_token = NULL WHERE id = ?");
        $clean_stmt->bind_param("i", $_SESSION['user_id']);
        $clean_stmt->execute();
        $clean_stmt->close();
    }

    session_unset();
    session_destroy();
    
    // 4. Send a 401 error and a clear JSON message.
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid or expired session. Please log in again.']);
    exit;
}

// If the session is valid, the script that included this file will continue its execution, 
// and the $conn variable will still be open and ready to use.
?>