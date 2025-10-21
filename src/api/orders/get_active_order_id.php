<?php
// /src/api/orders/get_active_order_id.php - Obtiene el ID de la orden activa para una mesa

session_start();
header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('America/Mexico_City');

$response = ['success' => false, 'order_id' => null, 'server_time' => date('Y-m-d H:i:s')];
$conn = null;

try {
    // 🔑 Obtener y validar el parámetro
    $table_number = isset($_GET['table_number']) ? (int)$_GET['table_number'] : 0;
    if ($table_number <= 0) {
        throw new Exception("Número de mesa inválido.");
    }

    // Conexión
    require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';
    if (!isset($conn) || !$conn instanceof mysqli || $conn->connect_error) {
        throw new Exception("Error de conexión a la base de datos.");
    }
    
    $conn->query("SET time_zone = '-06:00'");
    
    // CONSULTA CLAVE: Busca el order_id usando el table_number y el JOIN
    $sql = "
        SELECT 
            o.order_id 
        FROM 
            orders o
        JOIN 
            restaurant_tables rt ON o.table_id = rt.table_id
        WHERE 
            rt.table_number = ?
            AND o.status = 'PENDING' 
        LIMIT 1
    "; 
    
    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        throw new Exception("Error al preparar consulta: " . $conn->error);
    }

    $stmt->bind_param("i", $table_number);
    $stmt->execute();
    
    // Usar get_result() para consistencia
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();
    
    if ($row) {
        $response['success'] = true;
        $response['order_id'] = (int)$row['order_id'];
    }

} catch (Throwable $e) {
    error_log("Excepción en get_active_order_id: " . $e->getMessage());
    $response['message'] = "Error del servidor: " . $e->getMessage();
}

// Devolvemos el server_time y el resultado
echo json_encode($response, JSON_UNESCAPED_UNICODE);
if (isset($conn) && $conn instanceof mysqli) $conn->close();
exit;