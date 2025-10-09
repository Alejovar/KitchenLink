<?php
// get_tables.php - Endpoint API para obtener mesas filtradas del mesero actual

session_start();
header('Content-Type: application/json');

// 1. VERIFICAR AUTENTICACIÓN
if (!isset($_SESSION['user_id'])) {
    http_response_code(401); // Unauthorized
    echo json_encode(['success' => false, 'message' => 'Error: Sesión no válida.']);
    exit();
}

// CRÍTICO: Incluye tu archivo de conexión MySQLi
require '../../php/db_connection.php'; 

$server_id = $_SESSION['user_id']; 

// 2. CONSULTA SQL CLAVE
$sql = "SELECT table_number FROM restaurant_tables WHERE assigned_server_id = ? ORDER BY table_number ASC";

try {
    // MySQLi: PREPARAR, VINCULAR y EJECUTAR
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $server_id); // 'i' vincula el ID del mesero
    $stmt->execute();
    
    $result = $stmt->get_result(); 
    $mesas = [];
    while ($row = $result->fetch_assoc()) {
        $mesas[] = $row['table_number'];
    }
    
    $stmt->close();

    // 3. DEVOLVER RESPUESTA JSON
    echo json_encode(['success' => true, 'tables' => $mesas]);

} catch (\Exception $e) {
    // Si la consulta falla (ej. la tabla no existe), devuelve un error 500 al cliente.
    error_log("Error fetching tables from DB: " . $e->getMessage());
    http_response_code(500); 
    echo json_encode(['success' => false, 'message' => 'Error al consultar las mesas en la base de datos.']);
}
?>