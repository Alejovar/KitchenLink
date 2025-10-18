<?php
// /KitchenLink/src/api/orders/pending_orders/get_order_details.php
session_start();
// Define el huso horario para PHP.
date_default_timezone_set('America/Mexico_City'); 
header('Content-Type: application/json; charset=utf-8');

// --- Seguridad: solo meseros (rol_id = 2)
if (!isset($_SESSION['user_id']) || $_SESSION['rol_id'] != 2) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acceso denegado.'], JSON_UNESCAPED_UNICODE);
    exit();
}

// Conexión
require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';

try {
    // 🟢 ESTABLECER ZONA HORARIA: Necesario para que las consultas de fecha funcionen correctamente.
    if (isset($conn)) {
        // Usamos el offset UTC-6 para evitar el error de zona horaria desconocida.
        $conn->query("SET time_zone = '-06:00'");
    }

    // --- Validar parámetros
    $order_id = isset($_GET['order_id']) ? (int)$_GET['order_id'] : 0;
    
    // 🔑 RENOMBRAMOS la variable para reflejar que contiene el added_at del lote
    $added_at_raw = isset($_GET['batch_timestamp']) ? $_GET['batch_timestamp'] : ''; 

    // Limpiar el timestamp (decodificar y limpiar espacios)
    $added_at_raw = trim(urldecode($added_at_raw)); 

    // 🟢 CONVERTIR FORMATO: El JS envía formato ATOM, MySQL necesita DATETIME.
    if (!empty($added_at_raw)) {
        $dt = new DateTime($added_at_raw); 
        $added_at_time = $dt->format('Y-m-d H:i:s');
    } else {
        throw new Exception('Parámetro de tiempo (added_at) faltante o inválido.');
    }

    if ($order_id <= 0 || empty($added_at_time)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Parámetros de entrada inválidos.'], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // Verificar conexión
    if (!$conn) {
        throw new Exception("Conexión MySQLi no inicializada.");
    }

    // Consulta de los detalles de la orden
    $sql = "
        SELECT 
            od.detail_id,
            od.quantity,
            od.special_notes,
            od.item_status,
            od.preparation_area,
            p.name AS product_name,
            m.modifier_name
        FROM order_details od
        JOIN products p ON od.product_id = p.product_id
        LEFT JOIN modifiers m ON od.modifier_id = m.modifier_id
        -- 🔑 CORRECCIÓN: Filtramos por od.added_at en lugar de od.batch_timestamp
        WHERE od.order_id = ? AND od.added_at = ? 
          AND od.is_cancelled = FALSE 
          AND od.item_status != 'COMPLETADO' 
        ORDER BY od.preparation_area DESC, od.item_status DESC
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception('Error preparando consulta: ' . $conn->error); 

    // 🔑 Bind con el added_at limpio
    $stmt->bind_param("is", $order_id, $added_at_time);
    $stmt->execute();
    $result = $stmt->get_result();

    $items = [];
    while ($row = $result->fetch_assoc()) {
        $product_display_name = htmlspecialchars($row['product_name']);
        if ($row['modifier_name']) {
            $product_display_name .= " (" . htmlspecialchars($row['modifier_name']) . ")";
        }
        
        $items[] = [
            'product_name' => $product_display_name,
            'quantity' => (int)$row['quantity'],
            'special_notes' => ($row['special_notes'] && $row['special_notes'] !== '0') 
                                ? htmlspecialchars($row['special_notes']) 
                                : null,
            'item_status' => $row['item_status'] ?: 'PENDIENTE',
            'preparation_area' => $row['preparation_area'] ?: 'COCINA',
        ];
    }

    $stmt->close();
    $conn->close();

    echo json_encode([
        'success' => true,
        'items' => $items
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    if (isset($stmt)) $stmt->close();
    if (isset($conn)) $conn->close();

    // Enviamos el mensaje de error real para facilitar la depuración
    http_response_code(500);
    error_log("Error en get_order_details.php: " . $e->getMessage()); 
    echo json_encode(['success' => false, 'message' => 'Error de servidor (SQL): ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
}