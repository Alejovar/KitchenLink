<?php
// /src/api/orders/tpv/send_order.php - CORREGIDO

session_start();
header('Content-Type: application/json');

// 1. Seguridad y Conexión
if (!isset($_SESSION['user_id']) || $_SESSION['rol_id'] != 2) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Acceso no autorizado.']);
    exit();
}
require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';

// 2. Obtener los datos de la orden
$json_data = file_get_contents('php://input');
$data = json_decode($json_data);

if (!$data || !isset($data->table_number) || !isset($data->items)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos de la orden incompletos.']);
    exit();
}

$table_number = $data->table_number;
$items = $data->items;
$server_id = $_SESSION['user_id'];

// 3. Lógica de Base de Datos con Transacción
$conn->begin_transaction();

try {
    // Paso A: Obtener el table_id de la tabla 'restaurant_tables'
    $stmt_table = $conn->prepare("SELECT table_id FROM restaurant_tables WHERE table_number = ?");
    $stmt_table->bind_param("i", $table_number);
    $stmt_table->execute();
    $result_table = $stmt_table->get_result();
    if ($result_table->num_rows === 0) {
        // Si no existe, podría ser un error o una mesa no asignada. Por ahora, lanzamos error.
        throw new Exception("La mesa #{$table_number} no se encuentra en las mesas activas para órdenes.");
    }
    $table = $result_table->fetch_assoc();
    $table_id = $table['table_id'];
    $stmt_table->close();

    // Paso B: Verificar si ya hay una orden activa para esa mesa
    $stmt_find_order = $conn->prepare("SELECT order_id FROM orders WHERE table_id = ? AND status != 'PAGADA'");
    $stmt_find_order->bind_param("i", $table_id);
    $stmt_find_order->execute();
    $result_order = $stmt_find_order->get_result();
    $active_order = $result_order->fetch_assoc();
    $stmt_find_order->close();

    $order_id = 0;
    if ($active_order) {
        $order_id = $active_order['order_id'];
    } else {
        // Si no existe, creamos una nueva orden
        $stmt_create_order = $conn->prepare("INSERT INTO orders (table_id, server_id, status) VALUES (?, ?, 'RECIBIDA')");
        $stmt_create_order->bind_param("ii", $table_id, $server_id);
        $stmt_create_order->execute();
        $order_id = $conn->insert_id;
        $stmt_create_order->close();
    }

    if ($order_id === 0) {
        throw new Exception("No se pudo crear o encontrar la orden.");
    }
    
    // === CAMBIO PRINCIPAL: USAR LA TABLA 'order_details' Y SUS COLUMNAS ===
    $stmt_insert_item = $conn->prepare(
        "INSERT INTO order_details (order_id, product_id, modifier_id, quantity, price_at_order, special_notes) VALUES (?, ?, ?, 1, ?, ?)"
    );

    foreach ($items as $item) {
        if ($item->type === 'product') {
            $modifier_id = $item->modifier_id ?? null;
            $comment = $item->comment ?? '';
            // El orden de los parámetros debe coincidir con los '?'
            $stmt_insert_item->bind_param("iiids", $order_id, $item->id, $modifier_id, $item->price, $comment);
            $stmt_insert_item->execute();
        }
    }
    $stmt_insert_item->close();

    // Confirmamos la transacción
    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'Orden enviada a cocina exitosamente.']);

} catch (Exception $e) {
    // Si algo falló, revertimos
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage()]);
}

$conn->close();
?>