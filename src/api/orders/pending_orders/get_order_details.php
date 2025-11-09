<?php
// get_order_details.php - VERSIÓN CORREGIDA CON MODIFICADORES

require_once $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/security/check_session.php';
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL);

$response = ['success' => false, 'message' => 'Error desconocido.'];

// --- 1. CONEXIÓN A LA BASE DE DATOS ---
// 💡 MOVIMOS LA CONEXIÓN AQUÍ, AL INICIO
require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';
if (!$conn || $conn->connect_errno) {
    http_response_code(500);
    $response['message'] = 'Error de conexión a la base de datos.';
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

// --- 2. VERIFICACIÓN DE TURNO ABIERTO ---
// (Ahora $conn SÍ existe y se puede usar)
try {
    $stmt_shift = $conn->prepare("SELECT 1 FROM cash_shifts WHERE status = 'OPEN' LIMIT 1");
    if ($stmt_shift === false) throw new Exception("Error al preparar consulta de turno.");
    
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

} catch (Throwable $e) {
    http_response_code(500);
    $response['message'] = 'Error al verificar el turno: ' . $e->getMessage();
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}


// --- 3. LÓGICA PRINCIPAL ---
try {
    if (!isset($_SESSION['user_id'])) {
        throw new Exception("Acceso no autorizado.");
    }

    $order_id = filter_input(INPUT_GET, 'order_id', FILTER_VALIDATE_INT);
    $batch_id = filter_input(INPUT_GET, 'batch_id', FILTER_VALIDATE_INT);

    if (!$order_id || !$batch_id) {
        throw new Exception("Faltan parámetros: ID de orden o ID de lote.");
    }

    // 💡 YA NO NECESITAMOS EL 'require' DE LA BD AQUÍ

    // Paso 1: Obtener el timestamp del lote (sin cambios)
    $ts_stmt = $conn->prepare("SELECT batch_timestamp FROM order_details WHERE detail_id = ? LIMIT 1");
    $ts_stmt->bind_param("i", $batch_id);
    $ts_stmt->execute();
    $ts_result = $ts_stmt->get_result();
    $batch_row = $ts_result->fetch_assoc();
    $ts_stmt->close();

    if (!$batch_row) {
        throw new Exception("ID de lote no válido o no encontrado.");
    }
    $exact_batch_timestamp = $batch_row['batch_timestamp'];

    // Consulta con el JOIN a 'modifiers' (esto estaba bien)
    $sql = "
        SELECT 
            p.name AS product_name,
            m.modifier_name,
            od.quantity,
            od.special_notes,
            od.item_status,
            od.preparation_area,
            od.service_time
        FROM order_details od
        JOIN products p ON od.product_id = p.product_id
        LEFT JOIN modifiers m ON od.modifier_id = m.modifier_id
        WHERE od.order_id = ? AND od.batch_timestamp = ?
          AND od.item_status != 'COMPLETADO' 
          AND od.is_cancelled = 0
        ORDER BY od.service_time, od.detail_id
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("is", $order_id, $exact_batch_timestamp);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $items = [];
    while ($row = $result->fetch_assoc()) {
        $items[] = $row;
    }
    $stmt->close();

    $response = ['success' => true, 'items' => $items];

} catch (Throwable $e) {
    http_response_code(500); 
    $response = ['success' => false, 'message' => 'Error en el servidor: ' . $e->getMessage()];
} finally {
    if ($conn) $conn->close();
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit;
?>