<?php
// =====================================================
// get_current_order.php - VERSIÓN FINAL CORREGIDA
// Se ajustaron los nombres de las columnas en el JOIN para que coincidan con la BD.
// =====================================================

session_start();
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL);

$response = ['success' => false, 'message' => 'Error desconocido.'];
$conn = null;

try {
    // 1. Validar que se recibió un order_id
    $order_id = filter_input(INPUT_GET, 'order_id', FILTER_VALIDATE_INT);
    if (!$order_id) {
        throw new Exception("ID de orden no proporcionado o inválido.");
    }

    // 2. Conexión a la base de datos (usará UTC desde db_connection.php)
    require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';
    if (!$conn || $conn->connect_errno) {
        throw new Exception('Error de conexión a la base de datos.');
    }
    
    // 3. Consulta principal (CORREGIDA)
    $sql = "
        SELECT
            od.detail_id,
            od.product_id,
            p.name AS product_name,
            od.quantity,
            od.price_at_order,
            od.special_notes,
            od.modifier_id,
            od.batch_timestamp,
            od.service_time,
            m.modifier_name
        FROM order_details od
        -- ✅ CORRECCIÓN 1: Unir con p.product_id en lugar de p.id
        JOIN products p ON od.product_id = p.product_id
        -- ✅ CORRECCIÓN 2: Unir con m.modifier_id en lugar de m.id
        LEFT JOIN modifiers m ON od.modifier_id = m.modifier_id
        WHERE od.order_id = ?
        ORDER BY od.service_time ASC, od.batch_timestamp ASC, od.detail_id ASC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $items_by_time = [];

    // 4. Procesar y agrupar los resultados
    while ($row = $result->fetch_assoc()) {
        $service_time = $row['service_time'];
        
        if (!isset($items_by_time[$service_time])) {
            $items_by_time[$service_time] = [
                'service_time' => (int)$service_time,
                'items' => []
            ];
        }

        $item_name = $row['product_name'];
        if (!empty($row['modifier_name'])) {
            $item_name .= ' (' . $row['modifier_name'] . ')';
        }

        $items_by_time[$service_time]['items'][] = [
            'id' => (int)$row['product_id'],
            'name' => $item_name,
            'price' => (float)$row['price_at_order'],
            'comment' => $row['special_notes'],
            'modifier_id' => $row['modifier_id'] ? (int)$row['modifier_id'] : null,
            'batch_timestamp' => $row['batch_timestamp'] 
        ];
    }
    $stmt->close();
    
    $response = [
        'success' => true,
        'order_id' => $order_id,
        'times' => array_values($items_by_time)
    ];

} catch (Throwable $e) {
    http_response_code(500); 
    $response = [
        'success' => false, 
        'message' => 'Error en el servidor: ' . $e->getMessage()
    ];
} finally {
    if ($conn) $conn->close();
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit;