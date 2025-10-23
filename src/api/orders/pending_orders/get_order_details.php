<?php
// get_order_details.php - VERSIÓN CORREGIDA CON MODIFICADORES

require_once $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/security/check_session_api.php';
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL);

$response = ['success' => false, 'message' => 'Error desconocido.'];
$conn = null;

try {
    if (!isset($_SESSION['user_id'])) {
        throw new Exception("Acceso no autorizado.");
    }

    $order_id = filter_input(INPUT_GET, 'order_id', FILTER_VALIDATE_INT);
    $batch_id = filter_input(INPUT_GET, 'batch_id', FILTER_VALIDATE_INT);

    if (!$order_id || !$batch_id) {
        throw new Exception("Faltan parámetros: ID de orden o ID de lote.");
    }

    require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';

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

    // ✅ CAMBIO: La consulta ahora incluye un LEFT JOIN a la tabla 'modifiers'
    // y selecciona el 'modifier_name'.
    $sql = "
        SELECT 
            p.name AS product_name,
            m.modifier_name, -- Se añade esta línea
            od.quantity,
            od.special_notes,
            od.item_status,
            od.preparation_area,
            od.service_time
        FROM order_details od
        JOIN products p ON od.product_id = p.product_id
        LEFT JOIN modifiers m ON od.modifier_id = m.modifier_id -- Se añade esta línea
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