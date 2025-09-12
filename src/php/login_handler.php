<?php
// Incluye el archivo de conexión
require_once 'db_connection.php';

// Inicia la sesión para guardar datos del usuario
session_start();

// Verifica si el formulario fue enviado
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $user = $_POST['user'];
    $password = $_POST['password'];

    // Prepara la consulta SQL para obtener todos los datos necesarios del usuario
    $stmt = $conn->prepare("SELECT id, name, password, rol_id FROM users WHERE user = ?");
    $stmt->bind_param("s", $user);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $hashed_password = $row['password'];

        // Verifica si la contraseña es correcta
        if (password_verify($password, $hashed_password)) {
            // Contraseña correcta: inicia sesión y guarda todos los datos necesarios
            $_SESSION['loggedin'] = true;
            $_SESSION['user_id'] = $row['id']; // ID del usuario (MUY IMPORTANTE)
            $_SESSION['user_name'] = $row['name']; // Nombre del usuario (MUY IMPORTANTE)
            $_SESSION['rol_id'] = $row['rol_id'];
            
            // Redirige a la página de reservaciones.
            // Asegúrate de que la ruta sea correcta para tu proyecto.
            header("Location: /reservaciones.php"); 
            exit();
        } else {
            // Manejo de error: contraseña incorrecta
            echo "Contraseña incorrecta. Intenta de nuevo.";
        }
    } else {
        // Manejo de error: usuario no encontrado
        echo "Usuario no encontrado. Intenta de nuevo.";
    }

    $stmt->close();
}

$conn->close();
?>
