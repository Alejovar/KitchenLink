<?php
// get_pending_orders.php - CORRECCIÓN FINAL: USA ID DE LOTE

session_start();
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL);

$response = ['success' => false, 'message' => 'Error desconocido.'];
$conn = null;

try {
    if (!isset($_SESSION['user_id'])) {
        throw new Exception("Acceso no autorizado.");
    }
    $server_id = $_SESSION['user_id'];

    require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';

    // ✅ La consulta ahora agrupa por `batch_timestamp` y obtiene el `MIN(detail_id)`
    // como un identificador único y simple para el lote.
    $sql = "
        SELECT 
            o.order_id,
            rt.table_number,
            od.batch_timestamp,
            MIN(od.detail_id) as batch_id, -- Obtenemos el ID del primer item del lote
            SUM(CASE WHEN od.preparation_area = 'COCINA' AND od.item_status != 'COMPLETADO' THEN 1 ELSE 0 END) as total_kitchen_active,
            SUM(CASE WHEN od.preparation_area = 'BARRA' AND od.item_status != 'COMPLETADO' THEN 1 ELSE 0 END) as total_bar_active,
            SUM(CASE WHEN od.preparation_area = 'COCINA' AND od.item_status = 'LISTO' THEN 1 ELSE 0 END) as kitchen_ready,
            SUM(CASE WHEN od.preparation_area = 'BARRA' AND od.item_status = 'LISTO' THEN 1 ELSE 0 END) as bar_ready
        FROM orders o
        JOIN order_details od ON o.order_id = od.order_id
        JOIN restaurant_tables rt ON o.table_id = rt.table_id
        WHERE o.server_id = ? 
          AND o.status NOT IN ('PAGADA', 'CANCELADA', 'CLOSED')
          AND od.is_cancelled = 0
          AND od.item_status != 'COMPLETADO'
        GROUP BY o.order_id, rt.table_number, od.batch_timestamp
        HAVING total_kitchen_active > 0 OR total_bar_active > 0
        ORDER BY od.batch_timestamp DESC;
    ";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $server_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $orders_summary = [];
    while ($row = $result->fetch_assoc()) {
        $orders_summary[] = $row;
    }
    $stmt->close();

    $server_time = (new DateTime('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');

    $response = [
        'success' => true,
        'orders_summary' => $orders_summary,
        'server_time' => $server_time
    ];

} catch (Throwable $e) {
    http_response_code(500); 
    $response = ['success' => false, 'message' => 'Error en el servidor: ' . $e->getMessage()];
} finally {
    if ($conn) $conn->close();
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit;