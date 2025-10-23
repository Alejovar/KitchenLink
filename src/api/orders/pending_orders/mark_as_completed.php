<?php
// /api/orders/pending_orders/mark_as_completed.php - VERSIÓN CORREGIDA Y ROBUSTA

require_once $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/security/check_session_api.php';
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL);

$response = ['success' => false, 'message' => 'Error desconocido.'];
$conn = null;

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido.');
    }
    if (!isset($_SESSION['user_id'])) {
        throw new Exception("Acceso no autorizado.");
    }

    // ✅ PASO 1: Leer los datos de forma más segura, eliminando espacios en blanco.
    $raw_input = trim(file_get_contents('php://input'));
    if (empty($raw_input)) {
        throw new Exception("No se recibieron datos en la solicitud (cuerpo POST vacío).");
    }

    // ✅ PASO 2: Decodificar el JSON y lanzar un error si está mal formado.
    $data = json_decode($raw_input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Error al decodificar el JSON: " . json_last_error_msg());
    }

    $order_id = $data['order_id'] ?? null;
    $batch_id = $data['batch_id'] ?? null;

    // ✅ PASO 3: Validar que los parámetros no estén vacíos después de decodificar.
    if (empty($order_id) || empty($batch_id)) {
        $debug_info = "Recibido: order_id=" . var_export($order_id, true) . ", batch_id=" . var_export($batch_id, true);
        throw new Exception("Faltan parámetros para completar la orden. " . $debug_info);
    }

    require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';
    if (!$conn || $conn->connect_errno) {
        throw new Exception('Error de conexión a la base de datos.');
    }

    // 1. Obtener el timestamp exacto del lote usando el ID
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

    // 2. Usar ese timestamp para actualizar todos los items del lote
    $sql = "
        UPDATE order_details 
        SET item_status = 'COMPLETADO'
        WHERE order_id = ? 
          AND batch_timestamp = ?
          AND item_status IN ('LISTO', 'EN_PREPARACION', 'PENDIENTE')
          AND is_cancelled = 0
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("is", $order_id, $exact_batch_timestamp);

    if (!$stmt->execute()) {
        throw new Exception("Error al actualizar el estado: " . $stmt->error);
    }

    $response = ['success' => true, 'message' => 'Lote marcado como entregado.'];
    $stmt->close();

} catch (Throwable $e) {
    http_response_code(500); 
    $response = ['success' => false, 'message' => 'Error en el servidor: ' . $e->getMessage()];
} finally {
    if ($conn) $conn->close();
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit;