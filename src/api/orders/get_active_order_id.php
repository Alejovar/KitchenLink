<?php
header('Content-Type: application/json; charset=utf-8');

// --- Cargar conexión y dependencias ---
require '../../../../src/php/db_connection.php'; 

if (!isset($conn) || !$conn instanceof PDO) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de conexión a BD.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$table_number = filter_input(INPUT_GET, 'table_number', FILTER_VALIDATE_INT);

if (!$table_number) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Número de mesa inválido.'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // CORRECCIÓN: Quitamos la restricción o.status = 'PENDING'
    // Asumimos que la mesa solo puede tener una orden activa en orders.
    $sql = "
        SELECT 
            o.order_id
        FROM 
            orders o
        JOIN
            restaurant_tables rt ON rt.table_id = o.table_id
        WHERE 
            rt.table_number = :table_number
        LIMIT 1
    ";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':table_number', $table_number, PDO::PARAM_INT);
    $stmt->execute();
    $order_id = $stmt->fetchColumn();

    if ($order_id) {
        echo json_encode(['success' => true, 'order_id' => (int)$order_id], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(200); 
        echo json_encode(['success' => false, 'message' => 'No se encontró orden asociada a esta mesa.'], JSON_UNESCAPED_UNICODE);
    }

} catch (PDOException $e) {
    error_log("DB Error fetching order ID: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error interno del servidor.'], JSON_UNESCAPED_UNICODE);
}
?>