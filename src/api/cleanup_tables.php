<?php
// Incluimos la conexión a la base de datos
require_once __DIR__ . '/../php/db_connection.php';

// Establecemos la zona horaria para que los cálculos de tiempo sean correctos
date_default_timezone_set('America/Mexico_City');

// La misma consulta de limpieza que ya teníamos
$sql_cleanup = "UPDATE tables 
                SET status = 'disponible', status_changed_at = NULL 
                WHERE status = 'ocupado' AND status_changed_at <= NOW() - INTERVAL 6 HOUR";

// Ejecutamos la consulta
if ($conn->query($sql_cleanup)) {
    // Opcional: puedes guardar un registro de cuándo se ejecutó
    // echo "Limpieza ejecutada con éxito a las " . date('Y-m-d H:i:s');
} else {
    // Opcional: guardar el error en un archivo de log
    // error_log("Error en el cron job de limpieza: " . $conn->error);
}

$conn->close();
?>