<?php
// Incluye el archivo de conexión
include 'db_connection.php';

// Inicia la sesión para guardar datos del usuario
session_start();

// Verifica si el formulario fue enviado
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $user = $_POST['user'];
    $password = $_POST['password'];

    // Prepara la consulta SQL
    $stmt = $conn->prepare("SELECT password, rol_id FROM users WHERE user = ?");
    $stmt->bind_param("s", $user);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $hashed_password = $row['password'];

        // Verifica si la contraseña es correcta
        if (password_verify($password, $hashed_password)) {
            // Contraseña correcta: inicia sesión
            $_SESSION['loggedin'] = true;
            $_SESSION['user'] = $user;
            $_SESSION['rol_id'] = $row['rol_id'];
            
            // Redirige al dashboard.
            header("Location: /KitchenLink/dashboard.php");
            exit();
        } else {
            echo "Contraseña incorrecta. Intenta de nuevo.";
        }
    } else {
        echo "Usuario no encontrado. Intenta de nuevo.";
    }

    $stmt->close();
}

$conn->close();
?>