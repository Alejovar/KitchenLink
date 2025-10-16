<?php
// send_order.php - VERSIÓN FINAL CORREGIDA

session_start();
header('Content-Type: application/json');

$response = ['success' => false, 'message' => 'Ocurrió un error inesperado.'];

// 1. Seguridad y obtención de ID de mesero
if (!isset($_SESSION['user_id']) || $_SESSION['rol_id'] != 2) {
    $response['message'] = 'Acceso denegado.';
    echo json_encode($response);
    exit();
}
$server_id = $_SESSION['user_id'];

// 2. Obtener y validar datos de entrada
$data = json_decode(file_get_contents('php://input'), true);
$table_number = filter_var($data['table_number'] ?? 0, FILTER_VALIDATE_INT);
$items = $data['items'] ?? [];

if (!$table_number || empty($items)) {
    $response['message'] = 'Datos incompletos: Se requiere número de mesa y al menos un producto.';
    echo json_encode($response);
    exit();
}

// 3. Conexión a la Base de Datos
require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';

$conn->begin_transaction();
try {
    // 4. Buscar el table_id a partir del número de mesa
    $sql_table_id = "SELECT table_id FROM restaurant_tables WHERE table_number = ? LIMIT 1";
    $stmt_table = $conn->prepare($sql_table_id);
    $stmt_table->bind_param("i", $table_number);
    $stmt_table->execute();
    $table_result = $stmt_table->get_result();
    if ($table_result->num_rows === 0) throw new Exception("El número de mesa no es válido.");
    $table_id = $table_result->fetch_assoc()['table_id'];
    $stmt_table->close();

    // 5. Buscar una orden activa para la mesa o crear una nueva
    $order_id = null;
    $sql_find_order = "SELECT order_id FROM orders WHERE table_id = ? AND status NOT IN ('PAGADA', 'CANCELADA') LIMIT 1";
    $stmt_find = $conn->prepare($sql_find_order);
    $stmt_find->bind_param("i", $table_id);
    $stmt_find->execute();
    $order_res = $stmt_find->get_result();
    if ($order_row = $order_res->fetch_assoc()) {
        $order_id = $order_row['order_id'];
    } else {
        // CORRECCIÓN: Usamos 'PENDING' para coincidir con la base de datos y la vista de cocina.
        $sql_create_order = "INSERT INTO orders (table_id, server_id, status) VALUES (?, ?, 'PENDING')";
        $stmt_create = $conn->prepare($sql_create_order);
        $stmt_create->bind_param("ii", $table_id, $server_id);
        $stmt_create->execute();
        $order_id = $conn->insert_id;
        $stmt_create->close();
    }
    $stmt_find->close();
    if (!$order_id) throw new Exception("No se pudo obtener o crear la orden.");

    // ================== LÓGICA DE COMANDAS SEPARADAS ==================

    // 6. Se define UNA SOLA HORA para identificar toda esta comanda (lote)
    $batchTime = date('Y-m-d H:i:s');

    // 7. Se prepara la consulta para insertar los detalles de la orden
    $sql_insert_item = "INSERT INTO order_details (order_id, product_id, quantity, price_at_order, special_notes, modifier_id, batch_timestamp) VALUES (?, ?, 1, ?, ?, ?, ?)";
    $stmt_item = $conn->prepare($sql_insert_item);
    
    foreach ($items as $item) {
        // 8. Se inserta cada producto usando la misma variable '$batchTime'
        $stmt_item->bind_param("iidsss", $order_id, $item['id'], $item['price'], $item['comment'], $item['modifier_id'], $batchTime);
        $stmt_item->execute();
    }
    $stmt_item->close();
    
    // ===================================================================

    $conn->commit();
    $response['success'] = true;
    $response['message'] = 'Comanda enviada con éxito.';

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500); // Buena práctica para errores del servidor
    $response['message'] = 'Error en la base de datos: ' . $e->getMessage();
}

echo json_encode($response);
?>