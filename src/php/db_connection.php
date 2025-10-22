<?php
// Archivo de conexion con la base de datos
//IMPORTANTE, Modificar esto para correrlo de forma local segun sean las credenciales de tu base de datos
$servername = "sql300.host.adellya.my.id";
$username_db = "llya_40123800";
$password_db = "o9ibzcw7";
$dbname = "llya_40123800_KichenLink";

// Crea la conexión
$conn = new mysqli($servername, $username_db, $password_db, $dbname);
// 🟢 SOLUCIÓN FINAL PARA EL ERROR DE TIMEZONE
// Usa el desplazamiento UTC-6, que es compatible con todos los servidores MySQL.
$conn->query("SET time_zone = '-05:00'");
// Verifica la conexión
if ($conn->connect_error) {
    die("Error de conexión a la base de datos: " . $conn->connect_error);
}

// --- Forzar UTF-8 para que jso)n_encode funcione correctamente ---
$conn->set_charset("utf8mb4");
?>
