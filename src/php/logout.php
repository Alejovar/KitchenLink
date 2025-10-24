<?php
// logout.php - VERSIÓN FINAL Y COMPLETA
// Borra el token de la DB y destruye la sesión.

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 1. Obtener el ID del usuario antes de destruir la sesión PHP
$userId = $_SESSION['user_id'] ?? null;

// 2. CONEXIÓN Y BORRADO DE TOKEN EN DB (CRÍTICO)
if ($userId) {
    // Usamos la ruta absoluta para asegurar la inclusión de db_connection.php
    require_once $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';
    
    if (isset($conn) && $conn->connect_errno === 0) {
        try {
            // 🔑 ELIMINACIÓN DEL TOKEN DE LA DB: Pone el token en NULL
            $stmt = $conn->prepare("UPDATE users SET session_token = NULL WHERE id = ?");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $stmt->close();
            
            // Cerramos la conexión después de usarla.
            $conn->close(); 
            
        } catch (\Throwable $e) {
            error_log("Error al limpiar token en logout: " . $e->getMessage());
        }
    }
}

// 3. Destruir la sesión PHP (Limpieza de servidor)
session_unset();
session_destroy();

// 4. Destruir la cookie de sesión del navegador (Limpieza de cliente)
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// 5. Redirigir al inicio
header("Location: /KitchenLink/index.php");
exit();
?>