<?php
// Es crucial iniciar la sesión al principio de todo.
session_start();

// Incluimos el archivo que contiene la conexión a la base de datos.
// Asegúrate de que la ruta a tu archivo de conexión sea correcta.
require 'db_connection.php';

// Verificamos que los datos se hayan enviado mediante el método POST.
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // Obtenemos el usuario y la contraseña del formulario.
    $user = $_POST['user'];
    $password = $_POST['password'];

    // Preparamos una consulta SQL para evitar inyecciones SQL.
    $stmt = $conn->prepare("SELECT id, password, name, rol_id FROM users WHERE user = ?");
    $stmt->bind_param("s", $user);
    $stmt->execute();
    $result = $stmt->get_result();

    // Verificamos si la consulta devolvió algún resultado (si el usuario existe).
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $hashed_password = $row['password'];

        // Verificamos si la contraseña enviada coincide con la guardada en la base de datos.
        if (password_verify($password, $hashed_password)) {
            
            // ¡La contraseña es correcta! Guardamos los datos del usuario en la sesión.
            $_SESSION['loggedin'] = true;
            $_SESSION['user_id'] = $row['id'];
            $_SESSION['user_name'] = $row['name'];
            $_SESSION['rol_id'] = $row['rol_id'];
            
            // --- AQUÍ ESTÁ LA CONDICIÓN QUE PEDISTE ---
            // Verificamos si el rol_id del usuario es 4 (Hostess).
            if ($row['rol_id'] == 4) {
                // Si es Hostess, lo redirigimos a la página de reservaciones.
                header("Location: /KitchenLink/src/php/Reservations.php");
                exit(); // Detenemos la ejecución del script después de redirigir.
            } else {
                // Si tiene cualquier otro rol, lo mandamos a un "dashboard" general.
                // Puedes cambiar "dashboard.php" por la página que corresponda para los demás roles.
                header("Location: /KitchenLink/dashboard.php");
                exit();
            }

        } else {
            // La contraseña es incorrecta.
            // En un futuro, podrías redirigir de vuelta al login con un mensaje de error.
            echo "Error: Contraseña incorrecta.";
        }
    } else {
        // El usuario no fue encontrado en la base de datos.
        echo "Error: Usuario no encontrado.";
    }

    $stmt->close();
}

$conn->close();
?>