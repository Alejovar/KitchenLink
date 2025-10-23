<?php
// Preparamos la respuesta, será en formato JSON.
require_once $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/security/check_session_api.php';
header('Content-Type: application/json');

// LA FORMA CORRECTA DE INCLUIR EL ARCHIVO
// __DIR__ es la carpeta actual (.../api/)
// /../ sube a la carpeta padre (.../src/)
// /php/db_connection.php entra a la carpeta php y busca el archivo.
// (¡Muy bien explicado aquí! 👍)
require __DIR__ . '/../php/db_connection.php';

// Hacemos una consulta para traer todas las tablas con su estado actual.
// Como no hay datos del usuario, podemos usar query() de forma segura.
$result = $conn->query("SELECT id, table_name, status FROM tables ORDER BY table_name");

// Por si las dudas, checamos si la consulta falló.
if (!$result) {
    // Si algo sale mal, mandamos un error 500.
    http_response_code(500); // Internal Server Error
    echo json_encode(['success' => false, 'message' => 'Error en la consulta SQL: ' . $conn->error]);
    exit();
}

// Creamos un array para guardar todas las mesas que encontremos.
$tables = [];
while ($row = $result->fetch_assoc()) {
    $tables[] = $row;
}

// Mandamos la lista completa de mesas como respuesta.
echo json_encode($tables);

// Y como siempre, cerramos la conexión.
$conn->close();
?>