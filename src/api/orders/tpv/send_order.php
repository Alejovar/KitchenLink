<?php
// =====================================================
// send_order.php - CORREGIDO PARA USAR UTC
// =====================================================

session_start();
// ❗️ LÍNEA ELIMINADA: ya no se establece la zona horaria de PHP aquí.
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
    // db_connection.php ya establece la zona horaria a UTC
    require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';
    if (!$conn || $conn->connect_errno) {
        throw new Exception('Error de conexión a la base de datos.');
    }
    
    // Modelo de Menú
    require __DIR__ . '/MenuModel.php'; 
    $menuModel = new MenuModel($conn);

    $conn->begin_transaction();

    // 🟢 CAMBIO: Generar la hora actual explícitamente en UTC
    $now_timestamp = (new DateTime('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');
    
    $table_id = 0;
    $order_id = 0;

    // 1. BUSCAR O CREAR MESA (Lógica sin cambios)
    $stmt = $conn->prepare("SELECT table_id FROM restaurant_tables WHERE table_number=? LIMIT 1");
    $stmt->bind_param("i", $table_number);
    $stmt->execute();
    $res = $stmt->get_result();
    
    if ($row = $res->fetch_assoc()) {
        $table_id = $row['table_id'];
    } else {
        $client_count = 1;
        $stmt_insert_table = $conn->prepare("
            INSERT INTO restaurant_tables (table_number, assigned_server_id, client_count, occupied_at)
            VALUES (?, ?, ?, ?)
        ");
        $stmt_insert_table->bind_param("iiis", $table_number, $server_id, $client_count, $now_timestamp);
        $stmt_insert_table->execute();
        $table_id = $conn->insert_id;
        $stmt_insert_table->close();
        if (!$table_id) throw new Exception("Error al ocupar la mesa (restaurant_tables).");
    }
    $stmt->close();


    // 2. BUSCAR O CREAR ORDEN ACTIVA (Lógica sin cambios)
    $stmt = $conn->prepare("
        SELECT order_id FROM orders 
        WHERE table_id=? AND status NOT IN ('PAGADA','CANCELADA','CLOSED') 
        LIMIT 1
    ");
    $stmt->bind_param("i", $table_id);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($row = $res->fetch_assoc()) {
        $order_id = $row['order_id'];
    } else {
        $stmt2 = $conn->prepare("
            INSERT INTO orders (table_id, server_id, status, order_time)
            VALUES (?, ?, 'PENDING', ?)
        ");
        $stmt2->bind_param("iis", $table_id, $server_id, $now_timestamp);
        $stmt2->execute();
        $order_id = $conn->insert_id;
        $stmt2->close();
    }
    $stmt->close();
    if (!$order_id) throw new Exception('No se pudo crear o recuperar la orden.');

    
    // 5. INSERTAR ÍTEMS (Lógica sin cambios)
    $inserted_times = []; 

    foreach ($times as $time_block) {
        $service_time = intval($time_block['service_time'] ?? 0);
        $items = $time_block['items'] ?? [];

        if ($service_time <= 0 || empty($items)) {
            continue; 
        }
        
        $inserted_times[] = $service_time; 

        foreach ($items as $item) {
            $product_id = intval($item['id'] ?? 0);
            if ($product_id <= 0) continue; 

            $preparation_area = $menuModel->getPreparationAreaByProductId($product_id);
            if (!in_array($preparation_area, ['COCINA', 'BARRA'])) {
                throw new Exception("Área de preparación inválida para el producto ID {$product_id}.");
            }

            $notes = trim($item['comment'] ?? '');
            $modifier_id = intval($item['modifier_id'] ?? 0);
            $quantity = intval($item['quantity'] ?? 1);
            $price = floatval($item['price']);

            if ($modifier_id > 0) {
                $sql_insert_int = "
                    INSERT INTO order_details
                    (order_id, product_id, quantity, price_at_order, special_notes, modifier_id, preparation_area, batch_timestamp, service_time)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ";
                $stmt_int = $conn->prepare($sql_insert_int);
                $stmt_int->bind_param(
                    "iiidsissi", 
                    $order_id, $product_id, $quantity, $price, $notes, $modifier_id, $preparation_area, $now_timestamp, $service_time
                );
                if (!$stmt_int->execute()) throw new Exception('Fallo en la ejecución (INT modifier): ' . $stmt_int->error);
                $stmt_int->close();

            } else {
                $sql_insert_null = "
                    INSERT INTO order_details
                    (order_id, product_id, quantity, price_at_order, special_notes, modifier_id, preparation_area, batch_timestamp, service_time)
                    VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)
                ";
                $stmt_null = $conn->prepare($sql_insert_null);
                $stmt_null->bind_param(
                    "iiidsssi", 
                    $order_id, $product_id, $quantity, $price, $notes, $preparation_area, $now_timestamp, $service_time
                );
                if (!$stmt_null->execute()) throw new Exception('Fallo en la ejecución (NULL modifier): ' . $stmt_null->error);
                $stmt_null->close();
            }
        } 
    } 

    $conn->commit();

    $response = [
        'success' => true,
        'message' => "Comanda enviada con éxito. Tiempos procesados: " . implode(", ", array_unique($inserted_times)),
        'service_times' => array_unique($inserted_times) 
    ];

} catch (Throwable $e) {
    if (isset($conn) && $conn->connect_errno === 0) {
        $conn->rollback();
    }
    
    http_response_code(500); 
    $response = [
        'success' => false, 
        'message' => 'Error en el servidor: ' . $e->getMessage() . ' (Línea: ' . $e->getLine() . ')',
    ];
}

if ($conn) $conn->close();
echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit;