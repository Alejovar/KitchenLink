<?php
// =====================================================
// GET_MOVE_DATA.PHP - Carga los productos y mesas destino (MySQLi)
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

$source_table_number = filter_input(INPUT_GET, 'source_table', FILTER_VALIDATE_INT);

if (!$source_table_number || $source_table_number <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Número de mesa de origen inválido.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$response = ['success' => false, 'message' => ''];

try {
    // Definir estados finales que NO permiten movimiento
    $final_statuses = ['COBRADO', 'CLOSED', 'CANCELADO']; 
    $status_placeholders = str_repeat('?,', count($final_statuses) - 1) . '?';
    $status_types = str_repeat('s', count($final_statuses));

    // --- A. Obtener Order ID de Origen y datos de productos ---
    // NOTA: Se ha ELIMINADO la restricción de STATUS y solo se busca la orden activa (la que tiene productos).
    $sql_products = "
        SELECT 
            o.order_id, 
            od.detail_id, 
            od.quantity, 
            od.price_at_order,
            p.name AS product_name
        FROM 
            orders o
        JOIN 
            restaurant_tables rt ON rt.table_id = o.table_id
        JOIN 
            order_details od ON od.order_id = o.order_id
        JOIN
            products p ON p.product_id = od.product_id
        WHERE 
            rt.table_number = ? 
            AND o.status NOT IN ({$status_placeholders}) -- Excluir estados finales
    ";
    
    $stmt = $conn->prepare($sql_products);
    
    // Bind: 1 (mesa) + N (estados finales)
    $bind_params = array_merge([$source_table_number], $final_statuses);
    $stmt->bind_param("i" . $status_types, ...$bind_params); // i (int) + sss (strings)
    $stmt->execute();
    $result = $stmt->get_result();

    $products = [];
    $source_order_id = null;

    while ($row = $result->fetch_assoc()) {
        $source_order_id = $row['order_id'];
        $products[] = [
            'detail_id' => (int)$row['detail_id'],
            'quantity' => (int)$row['quantity'],
            'price_at_order' => (float)$row['price_at_order'],
            'product_name' => $row['product_name']
        ];
    }
    $stmt->close();
    
    if (!$source_order_id) {
        $response['message'] = "No se encontró una orden activa con productos para la Mesa {$source_table_number}.";
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit;
    }

    // --- B. Obtener todas las Mesas Destino ---
    $sql_tables = "
        SELECT 
            table_number, 
            client_count, 
            CASE WHEN (SELECT COUNT(o.order_id) FROM orders o WHERE o.table_id = rt.table_id AND o.status NOT IN ({$status_placeholders})) > 0 THEN 'Ocupada (con orden)' ELSE 'Disponible' END AS status
        FROM 
            restaurant_tables rt
        WHERE 
            table_number != ?
    ";
    $stmt = $conn->prepare($sql_tables);
    $bind_tables_params = array_merge([$source_table_number], $final_statuses);
    $stmt->bind_param("i" . $status_types, ...$bind_tables_params);
    
    $stmt->execute();
    $tables_result = $stmt->get_result();
    $available_tables = $tables_result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();


    $response['success'] = true;
    $response['source_order_id'] = (int)$source_order_id;
    $response['products'] = $products;
    $response['available_tables'] = $available_tables;

} catch (Throwable $e) {
    http_response_code(500);
    $response['message'] = 'Error de servidor: ' . $e->getMessage();
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit();
?>