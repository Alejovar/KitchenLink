<?php
// Archivo de conexion con la base de datos
//IMPORTANTE, Modificar esto para correrlo de forma local segun sean las credenciales de tu base de datos
$servername = "sql300.host.adellya.my.id";
$username_db = "llya_40123800";
$password_db = "o9ibzcw7";
$dbname = "llya_40123800_KichenLink";

// Crea la conexión
$conn = new mysqli($servername, $username_db, $password_db, $dbname);

// Verifica la conexión
if ($conn->connect_error) {
    die("Error de conexión a la base de datos: " . $conn->connect_error);
}

// --- Forzar UTF-8 para que json_encode funcione correctamente ---
$conn->set_charset("utf8mb4");
?>
