<?php
// /KitchenLink/src/api/kitchen/get_kitchen_history.php (VERSIÓN CORRECTA en MySQLi)

header('Content-Type: application/json; charset=utf-8');
$response = ['success' => false, 'production_items' => []];
$conn = null;

try {
    // Usamos una ruta absoluta desde la raíz del servidor para más seguridad.
    require_once $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';

    // Si no se envía una fecha, se usa la del día actual.
    $selected_date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
    
    // Valida que la fecha tenga el formato correcto para seguridad.
    if (!preg_match("/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/", $selected_date)) {
        throw new Exception("Formato de fecha no válido.");
    }
    
    $sql = "
        SELECT 
            kph.order_id, kph.table_number, kph.server_name,
            kph.batch_timestamp AS added_at,
            kph.timestamp_added AS order_time,
            kph.service_time, kph.product_name, kph.quantity, kph.special_notes,
            'LISTO' as item_status,
            kph.original_detail_id as detail_id
        FROM 
            kitchen_production_history kph
        WHERE 
            DATE(kph.timestamp_completed) = ?
        ORDER BY 
            kph.batch_timestamp ASC, kph.service_time ASC
    ";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Error en la preparación de la consulta: " . $conn->error);
    }
    
    // Vinculamos el parámetro de fecha
    $stmt->bind_param("s", $selected_date);
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    // Obtenemos todos los resultados como un array asociativo
    $response['production_items'] = $result->fetch_all(MYSQLI_ASSOC);
    $response['success'] = true;

    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    $response['error'] = 'Error al obtener el historial de producción.';
    $response['details'] = $e->getMessage();
} finally {
    if ($conn) {
        $conn->close();
    }
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);