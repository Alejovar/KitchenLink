<?php
// ===================================================================
// send_order.php - VERSIÓN FINAL CORREGIDA Y SEGURA CON BLOQUEO DE MESA CERRADA
// ===================================================================

require_once $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/security/check_session.php';
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0); 
error_reporting(E_ALL);

$response = ['success' => false, 'message' => 'Error desconocido.'];
$conn = null;

try {
    // 🔒 Validar sesión y rol
    if (!isset($_SESSION['user_id']) || $_SESSION['rol_id'] != 2) {
        http_response_code(403);
        throw new Exception('Acceso denegado: solo meseros pueden enviar órdenes.');
    }
    $server_id = $_SESSION['user_id'];

    // 📦 Leer datos JSON de entrada
    $rawData = trim(file_get_contents('php://input'));
    if ($rawData === '') throw new Exception('No se recibieron datos (JSON vacío).');
    $data = json_decode($rawData, true, 512, JSON_THROW_ON_ERROR);

    $table_number = intval($data['table_number'] ?? 0);
    $times = $data['times'] ?? [];
    
    if ($table_number <= 0) throw new Exception('Número de mesa inválido.');
    if (empty($times)) {
        throw new Exception("No hay ítems nuevos para enviar en la comanda.");
    }

    // 🧩 Conexión a la base de datos
    require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php'; 
    if (!$conn || $conn->connect_errno) {
        throw new Exception('Error de conexión a la base de datos.');
    }
    
        // Verificar que el turno de caja esté abierto
$stmt_shift = $conn->prepare("SELECT 1 FROM cash_shifts WHERE status = 'OPEN' LIMIT 1");
$stmt_shift->execute();
$shift_result = $stmt_shift->get_result();

if ($shift_result->num_rows === 0) {
    // ¡TURNO CERRADO! Rechazamos la acción.
    $stmt_shift->close();
    http_response_code(403); // Prohibido
    echo json_encode(['success' => false, 'message' => 'El turno de caja está cerrado. No se pueden procesar nuevas acciones.']);
    exit;
}
$stmt_shift->close();
    
    require __DIR__ . '/MenuModel.php'; 
    $menuModel = new MenuModel($conn);

    $conn->begin_transaction();

    $now_timestamp = (new DateTime('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');
    
    $table_id = 0;
    $order_id = 0;

    // 1. VERIFICACIÓN Y OBTENCIÓN DE MESA ACTIVA (BLOQUEO CRÍTICO)
    
    // <-- 1. MODIFICAMOS LA CONSULTA PARA INCLUIR pre_bill_status
    $stmt_check_active = $conn->prepare("
        SELECT table_id, assigned_server_id, pre_bill_status FROM restaurant_tables WHERE table_number = ?
    ");
    $stmt_check_active->bind_param("i", $table_number);
    $stmt_check_active->execute();
    $active_table_res = $stmt_check_active->get_result();
    $stmt_check_active->close();
    
    if ($active_table_res->num_rows == 0) {
        $conn->rollback();
        http_response_code(410); 
        echo json_encode([
            'success' => false, 
            'message' => 'MESA CERRADA: El cajero ya cerró esta cuenta. Por favor, actualiza la lista de mesas.',
            'code' => 'CLOSED_BY_CASHIER'
        ]);
        exit;
    }
    
    $active_table_row = $active_table_res->fetch_assoc();
    $table_id = $active_table_row['table_id'];
    
    // <-- 2. AÑADIMOS LA BARRERA DE SEGURIDAD
    // 🛑 BLOQUEO: Si la cuenta ya fue solicitada, no se pueden agregar más ítems.
    if ($active_table_row['pre_bill_status'] === 'REQUESTED') {
        $conn->rollback(); // Detenemos la transacción
        http_response_code(403); // 403 Forbidden: Tienes permiso para entrar, pero no para hacer esta acción ahora.
        echo json_encode([
            'success' => false, 
            'message' => 'ACCIÓN BLOQUEADA: La cuenta ya fue solicitada al cajero y no se pueden agregar más productos.',
            'code' => 'PRE_BILL_REQUESTED'
        ]);
        exit; // Detenemos el script
    }
    
    // 2. BUSCAR O CREAR ORDEN ACTIVA
    // ... (El resto del código sigue exactamente igual)
    $stmt_order = $conn->prepare("SELECT order_id FROM orders WHERE table_id=? AND status NOT IN ('PAID', 'CLOSED') LIMIT 1");
    $stmt_order->bind_param("i", $table_id);
    $stmt_order->execute();
    $res_order = $stmt_order->get_result();

    if ($row_order = $res_order->fetch_assoc()) {
        $order_id = $row_order['order_id'];
    } else {
        $stmt_create_order = $conn->prepare("INSERT INTO orders (table_id, server_id, status, order_time) VALUES (?, ?, 'PENDING', ?)");
        $stmt_create_order->bind_param("iis", $table_id, $server_id, $now_timestamp);
        $stmt_create_order->execute();
        $order_id = $conn->insert_id;
        $stmt_create_order->close();
    }
    $stmt_order->close();
    if (!$order_id) throw new Exception('No se pudo crear o recuperar la orden.');

    // 3. INSERTAR ÍTEMS Y OBTENER PRECIOS DESDE LA BD
    $stmt_get_price = $conn->prepare("SELECT price FROM products WHERE product_id = ?");
    $sql_insert_detail = "INSERT INTO order_details (order_id, product_id, quantity, price_at_order, special_notes, modifier_id, preparation_area, batch_timestamp, service_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt_insert_detail = $conn->prepare($sql_insert_detail);

    foreach ($times as $time_block) {
        $service_time = intval($time_block['service_time'] ?? 0);
        $items = $time_block['items'] ?? [];
        if ($service_time <= 0 || empty($items)) continue; 

        foreach ($items as $item) {
            $product_id = intval($item['id'] ?? 0);
            if ($product_id <= 0) continue; 

            $stmt_get_price->bind_param("i", $product_id);
            $stmt_get_price->execute();
            $price_result = $stmt_get_price->get_result();
            $product_row = $price_result->fetch_assoc();

            if (!$product_row) {
                throw new Exception("El producto con ID {$product_id} no fue encontrado.");
            }
            $authoritative_price = $product_row['price']; 

            $preparation_area = $menuModel->getPreparationAreaByProductId($product_id);
            $notes = trim($item['comment'] ?? '');
            $modifier_id = !empty($item['modifier_id']) ? intval($item['modifier_id']) : null;
            $quantity = intval($item['quantity'] ?? 1);

            $stmt_insert_detail->bind_param(
                "iiidssssi", 
                $order_id, $product_id, $quantity, $authoritative_price, $notes, $modifier_id, $preparation_area, $now_timestamp, $service_time
            );
            if (!$stmt_insert_detail->execute()) throw new Exception('Fallo al insertar detalle: ' . $stmt_insert_detail->error);
        } 
    }
    $stmt_get_price->close();
    $stmt_insert_detail->close();

    // 4. ACTUALIZAR EL TOTAL DE LA ORDEN
    $stmt_update_total = $conn->prepare("
        UPDATE orders o
        SET o.total = (
            SELECT SUM( (od.price_at_order + COALESCE(m.modifier_price, 0)) * od.quantity )
            FROM order_details od
            LEFT JOIN modifiers m ON od.modifier_id = m.modifier_id
            WHERE od.order_id = ? AND od.is_cancelled = FALSE
        )
        WHERE o.order_id = ?
    ");
    $stmt_update_total->bind_param("ii", $order_id, $order_id);
    $stmt_update_total->execute();
    $stmt_update_total->close();

    $conn->commit();

    $response = ['success' => true, 'message' => "Comanda enviada con éxito."];

} catch (Throwable $e) {
    if (isset($conn) && $conn->ping()) $conn->rollback();
    http_response_code(500); 
    $response = ['success' => false, 'message' => 'Error: ' . $e->getMessage()];
}

if ($conn) $conn->close();
echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit;
?>