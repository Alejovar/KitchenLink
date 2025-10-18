<?php
// =====================================================
// send_order.php - Envío de orden con hora local y notas NULL
// =====================================================

// ⚠️ Debe ser la PRIMERA línea del archivo (sin espacios antes)
session_start();

// 🟢 CORRECCIÓN CLAVE 1: Define el huso horario para PHP para que todas las funciones usen la hora local (México/Saltillo).
// Esto resuelve la diferencia de 3 horas (21:00 vs 18:00).
date_default_timezone_set('America/Mexico_City'); 

header('Content-Type: application/json; charset=utf-8');

// 🔒 Silenciar salida no controlada pero registrar errores
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

$response = ['success' => false, 'message' => 'Error desconocido.'];

try {
    // Validar sesión
    if (!isset($_SESSION['user_id']) || $_SESSION['rol_id'] != 2) {
        throw new Exception('Acceso denegado.');
    }
    $server_id = $_SESSION['user_id'];

    // Leer datos JSON
    $rawData = trim(file_get_contents('php://input'));
    if ($rawData === '') throw new Exception('No se recibieron datos.');

    $data = json_decode($rawData, true, 512, JSON_THROW_ON_ERROR);
    $table_number = intval($data['table_number'] ?? 0);
    $items = $data['items'] ?? [];
    if ($table_number <= 0 || empty($items)) {
        throw new Exception('Datos incompletos.');
    }

    // Conexión
    require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';
    require __DIR__ . '/MenuModel.php';
    $menuModel = new MenuModel($conn);
    if (!$conn || $conn->connect_errno) throw new Exception('Error de conexión a la base de datos.');

    $conn->begin_transaction();

    // Buscar mesa
    $stmt = $conn->prepare("SELECT table_id FROM restaurant_tables WHERE table_number=? LIMIT 1");
    $stmt->bind_param("i", $table_number);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) throw new Exception("Mesa no válida.");
    $table_id = $res->fetch_assoc()['table_id'];
    $stmt->close();

    // Buscar orden activa o crear nueva
    $stmt = $conn->prepare("SELECT order_id FROM orders WHERE table_id=? AND status NOT IN ('PAGADA','CANCELADA','CLOSED') LIMIT 1");
    $stmt->bind_param("i", $table_id);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($row = $res->fetch_assoc()) {
        $order_id = $row['order_id'];
    } else {
        $stmt2 = $conn->prepare("INSERT INTO orders (table_id, server_id, status) VALUES (?, ?, 'PENDING')");
        $stmt2->bind_param("ii", $table_id, $server_id);
        $stmt2->execute();
        $order_id = $conn->insert_id;
        $stmt2->close();
    }
    $stmt->close();

    if (!$order_id) throw new Exception('No se pudo crear o recuperar la orden.');

    // Hora local (Ahora esto usa la zona horaria definida arriba)
    $tz = new DateTimeZone('America/Mexico_City');
    $batch_timestamp = (new DateTime('now', $tz))->format('Y-m-d H:i:s');

    // Insertar items
    $stmt_item = $conn->prepare("
        INSERT INTO order_details
        (order_id, product_id, quantity, price_at_order, special_notes, modifier_id, batch_timestamp, preparation_area)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    if (!$stmt_item) throw new Exception('Error preparando inserción: ' . $conn->error);

    foreach ($items as $item) {
        $preparation_area = $menuModel->getPreparationAreaByProductId($item['id']);
        
        // 🟢 CORRECCIÓN 2A: Si no hay notas, usa "" en lugar de NULL para bind_param('s').
        $notes = (!isset($item['comment']) || trim($item['comment']) === '' || $item['comment'] === '0') ? "" : trim($item['comment']);
        
        // 🟢 CORRECCIÓN 2B: Si no hay modifier, usa 0 en lugar de NULL para bind_param('i').
        $modifier_id = isset($item['modifier_id']) && $item['modifier_id'] !== '' ? intval($item['modifier_id']) : 0;

        // Variables obligatorias para bind_param
        $product_id = intval($item['id']);
        $quantity = intval($item['quantity'] ?? 1);
        $price = floatval($item['price']);
        $special_notes = $notes;    // Ahora es "" o el texto
        $modifier = $modifier_id;   // Ahora es 0 o el ID
        $prep_area = $preparation_area;

        $stmt_item->bind_param(
            "iiidssis",
            $order_id,
            $product_id,
            $quantity,
            $price,
            $special_notes,
            $modifier,
            $batch_timestamp, // Este valor ahora debe ser la hora local (21:xx)
            $prep_area
        );
        
        if (!$stmt_item->execute()) {
             // throw new Exception('Fallo en la ejecución del item: ' . $stmt_item->error); // Para depuración
        }
    }
    $stmt_item->close();

    $conn->commit();
    $response = ['success' => true, 'message' => 'Comanda enviada con éxito.'];

} catch (Throwable $e) {
    if (isset($conn) && $conn->connect_errno === 0) $conn->rollback();
    http_response_code(500);
    $response = ['success' => false, 'message' => $e->getMessage()];
}

// ✅ Enviar JSON limpio
echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit;