<?php
// Incluye el archivo de conexión a la base de datos
include 'db_connection.php';

// Si el script llega a esta línea, la conexión fue exitosa.
echo "¡Conexión exitosa!";

$conn->close();
?>