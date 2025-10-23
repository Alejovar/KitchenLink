<?php
session_start();

// Si hay un usuario en la sesión, limpiamos su token en la BD.
if (isset($_SESSION['user_id'])) {
    require 'db_connection.php';
    
    // ✅ Pone el token en NULL, "liberando la habitación".
    $stmt = $conn->prepare("UPDATE users SET session_token = NULL WHERE id = ?");
    $stmt->bind_param("i", $_SESSION['user_id']);
    $stmt->execute();
    $stmt->close();
    $conn->close();
}

// Destruimos la sesión actual.
session_unset();
session_destroy();

// Redirigimos al login.
header("Location: /KitchenLink/index.html"); // O tu página de login
exit();
?>
