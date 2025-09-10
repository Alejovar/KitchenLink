<?php
$servername = "localhost";
$username_db = "root";
$password_db = "Avm050802Avm?"; // Asegúrate de que esta sea la contraseña de tu base de datos
$dbname = "kitchenlink";

// Crea la conexión
$conn = new mysqli($servername, $username_db, $password_db, $dbname);

// Verifica la conexión
if ($conn->connect_error) {
    die("Error de conexión a la base de datos: " . $conn->connect_error);
}
?>