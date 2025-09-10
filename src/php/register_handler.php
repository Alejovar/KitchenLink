<?php
include 'db_connection.php';
session_start();

$admin_password_check = "tu_clave_secreta"; // Reemplaza con tu clave segura

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $admin_password_input = $_POST['admin_password'];

    // 1. Verifica la contraseña del administrador
    if ($admin_password_input !== $admin_password_check) {
        echo "Contraseña de administrador incorrecta.";
        exit();
    }

    // 2. Obtiene los datos del formulario
    $username = $_POST['username'];
    $password = $_POST['password'];
    $nombre = $_POST['nombre']; // Asegúrate de añadir el campo 'nombre' en el formulario HTML
    $role_id = $_POST['role_id'];

    // 3. Encripta la contraseña del nuevo usuario
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    // 4. Inserta el nuevo usuario en la base de datos
    $stmt = $conn->prepare("INSERT INTO users (user, password, nombre, rol_id) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("sssi", $username, $hashed_password, $nombre, $role_id);

    if ($stmt->execute()) {
        echo "Usuario " . htmlspecialchars($username) . " registrado exitosamente.";
    } else {
        echo "Error: " . $stmt->error;
    }

    $stmt->close();
}

$conn->close();
?>