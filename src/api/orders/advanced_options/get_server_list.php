<?php
// =====================================================
// GET_SERVER_LIST.PHP - Obtiene la lista de meseros (MySQLi)
// =====================================================
require_once $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/security/check_session_api.php';
header('Content-Type: application/json; charset=utf-8');

// --- Cargar conexión ---
$absolute_path_to_conn = $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';
require_once $absolute_path_to_conn;

if (!$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de conexión con la base de datos.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$response = ['success' => false, 'message' => ''];

try {
    // Asumo que el rol ID para Mesero es 2
    $sql = "SELECT id, name FROM users WHERE rol_id = 2 ORDER BY name";
    $result = $conn->query($sql);
    
    $servers = [];
    while($row = $result->fetch_assoc()) {
        $servers[] = ['id' => (int)$row['id'], 'name' => $row['name']];
    }
    
    $response['success'] = true;
    $response['servers'] = $servers;

} catch (Throwable $e) {
    http_response_code(500);
    $response['message'] = 'Error de servidor: ' . $e->getMessage();
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit();
?>