<?php
header('Content-Type: application/json');

// LA FORMA CORRECTA DE INCLUIR EL ARCHIVO
// __DIR__ es la carpeta actual (.../api/)
// /../ sube a la carpeta padre (.../src/)
// /php/db_connection.php entra a la carpeta php y busca el archivo.
require __DIR__ . '/../php/db_connection.php';

// Este código se mantiene igual
$result = $conn->query("SELECT id, table_name, status FROM tables ORDER BY table_name");

if (!$result) {
    // Si la consulta falla, envía un error
    http_response_code(500); // Internal Server Error
    echo json_encode(['success' => false, 'message' => 'Error en la consulta SQL: ' . $conn->error]);
    exit();
}

$tables = [];
while ($row = $result->fetch_assoc()) {
    $tables[] = $row;
}

echo json_encode($tables);
$conn->close();
?>