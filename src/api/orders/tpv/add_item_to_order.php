<?php
// add_item_to_order.php - API para añadir un ítem a una orden activa o crear una nueva.

session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['rol_id'] != 2) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado.']);
    exit();
}

require '../../../php/db_connection.php'; 

// 1. OBTENER DATOS DE LA ORDEN DEL JSON
$data = json_decode(file_get_contents('php://input'), true);

$table_number = filter_var($data['table_number'] ?? null, FILTER_VALIDATE_INT);
$product_id = filter_var($data['product_id'] ?? null, FILTER_VALIDATE_INT);
$modifier_id = filter_var($data['modifier_id'] ?? null, FILTER_VALIDATE_INT); 
$price_at_order = filter_var($data['price_at_order'] ?? null, FILTER_VALIDATE_FLOAT);

if (!$table_number || !$product_id || !$price_at_order) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos de producto o mesa incompletos.']);
    exit();
}

// 2. LÓGICA: Obtener order_id activo o crear uno nuevo (Transacciones)
try {
    $conn->begin_transaction();
    $server_id = $_SESSION['user_id'];

    // --- a) Buscar el ID de la mesa ---
    $stmt_table = $conn->prepare("SELECT table_id FROM restaurant_tables WHERE table_number = ? LIMIT 1");
    $stmt_table->bind_param("i", $table_number);
    $stmt_table->execute();
    $result_table = $stmt_table->get_result();
    $table_row = $result_table->fetch_assoc();
    $table_id = $table_row['table_id'] ?? 0;
    $stmt_table->close();

    if ($table_id === 0) {
        throw new Exception("Mesa no registrada en el sistema.");
    }

    // --- b) Buscar si existe una orden PENDIENTE ---
    $stmt_order = $conn->prepare("SELECT order_id FROM orders WHERE table_id = ? AND status = 'PENDING'");
    $stmt_order->bind_param("i", $table_id);
    $stmt_order->execute();
    $result_order = $stmt_order->get_result();
    $order_row = $result_order->fetch_assoc();
    $order_id = $order_row['order_id'] ?? 0;
    $stmt_order->close();

    // --- c) Si no hay orden, crear una nueva ---
    if ($order_id === 0) {
        $stmt_new_order = $conn->prepare("INSERT INTO orders (table_id, server_id, status) VALUES (?, ?, 'PENDING')");
        $stmt_new_order->bind_param("ii", $table_id, $server_id);
        $stmt_new_order->execute();
        $order_id = $conn->insert_id;
        $stmt_new_order->close();
    }
    
    // 3. AÑADIR EL DETALLE A order_details
    $quantity = 1; 
    
    $sql_detail = "INSERT INTO order_details (order_id, product_id, quantity, price_at_order, modifier_id) 
                   VALUES (?, ?, ?, ?, ?)";
    
    $stmt_detail = $conn->prepare($sql_detail);
    // Bind: order_id (i), product_id (i), quantity (i), price (d), modifier_id (i)
    $stmt_detail->bind_param("iiidi", $order_id, $product_id, $quantity, $price_at_order, $modifier_id);
    $stmt_detail->execute();
    $stmt_detail->close();
    
    $conn->commit(); // Confirma la transacción
    
    echo json_encode(['success' => true, 'order_id' => $order_id, 'message' => 'Producto añadido a la orden.']);

} catch (\Exception $e) {
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    error_log("DB Error in add_item_to_order: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al procesar el pedido: ' . $e->getMessage()]);
}
?>