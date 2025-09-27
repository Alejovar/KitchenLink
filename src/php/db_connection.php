<?php
// Archivo de conexion con la base de datos
//IMPORTANTE, Modificar esto para correrlo de forma local segun sean las credenciales de tu base de datos
$servername = "127.0.0.1";
$username_db = "root";
$password_db = "Avm050802Avm?";
$dbname = "KitchenLink";

// Crea la conexión
$conn = new mysqli($servername, $username_db, $password_db, $dbname);

// Verifica la conexión
if ($conn->connect_error) {
    die("Error de conexión a la base de datos: " . $conn->connect_error);
}
?>