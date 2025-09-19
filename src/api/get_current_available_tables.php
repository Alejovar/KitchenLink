<?php
// src/api/get_current_available_tables.php
header('Content-Type: application/json');
require '../php/db_connection.php';

try {
    // Consulta simple para traer solo mesas con estado 'disponible'
    $query = "SELECT id, table_name FROM tables WHERE status = 'disponible' ORDER BY table_name";
    $result = $conn->query($query);
    
    $tables = [];
    while ($row = $result->fetch_assoc()) {
        $tables[] = $row;
    }

    echo json_encode(['success' => true, 'tables' => $tables]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
}

$conn->close();
?>