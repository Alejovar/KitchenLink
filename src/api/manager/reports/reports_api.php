<?php
// /KitchenLink/src/api/manager/reports/reports_api.php - API de Reportes Gerenciales

require_once $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/security/check_session.php';
header('Content-Type: application/json; charset=utf-8');

$response = ['success' => false, 'message' => 'Error desconocido.'];

// Seguridad: Solo Gerente (1)
if (!isset($_SESSION['rol_id']) || $_SESSION['rol_id'] != 1) {
    http_response_code(403);
    $response['message'] = 'Acceso denegado. Solo gerentes.';
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit();
}

try {
    require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';
    if (!$conn) throw new Exception('Error de conexión a la base de datos.');

    $rawData = trim(file_get_contents('php://input'));
    $data = json_decode($rawData, true, 512, JSON_THROW_ON_ERROR);
    $action = $data['action'] ?? '';
    
    // Extracción común de fechas
    $start_date = $data['start_date'] ?? null;
    $end_date = $data['end_date'] ?? null;
    $server_id = $data['server_id'] ?? null;
    
    if (in_array($action, ['get_product_mix', 'get_service_metrics', 'get_table_rotation', 'get_cancellation_report', 'get_reservation_metrics']) && (!$start_date || !$end_date)) {
        throw new Exception('Fechas requeridas para el reporte.');
    }

    switch ($action) {
        
        case 'get_product_mix':
            // Reporte 1: Productos Más Vendidos (Sin cambios, es funcional)
            $sql = "
                SELECT
                    p.name AS product_name,
                    SUM(od.quantity) AS total_quantity,
                    SUM( (od.price_at_order + COALESCE(m.modifier_price, 0)) * od.quantity ) AS total_bruto
                FROM order_details od
                JOIN orders o ON od.order_id = o.order_id
                JOIN products p ON od.product_id = p.product_id
                LEFT JOIN modifiers m ON od.modifier_id = m.modifier_id
                WHERE
                    o.status IN ('PAID', 'CLOSED') AND o.order_time >= ? AND o.order_time < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY p.product_id, p.name
                ORDER BY total_quantity DESC
            ";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ss", $start_date, $end_date);
            $stmt->execute();
            $report_data = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
            $response = ['success' => true, 'data' => $report_data];
            break;

        case 'get_service_metrics':
            // Reporte 2.2: Métricas de Servicio (Personas Atendidas por Mesero/General)
            // Requiere que la tabla 'orders' tenga la columna 'people_count'.
             $sql = "
                SELECT 
                    u.name AS server_name,
                    u.id AS server_id,
                    COALESCE(SUM(o.people_count), 0) AS served_people
                FROM 
                    orders o
                JOIN 
                    users u ON o.server_id = u.id
                WHERE
                    o.status IN ('PAID', 'CLOSED') 
                    AND o.order_time >= ? 
                    AND o.order_time < DATE_ADD(?, INTERVAL 1 DAY)
                    " . ($server_id ? " AND o.server_id = ?" : "") . "
                GROUP BY 
                    u.id, u.name
                ORDER BY 
                    served_people DESC
            ";
            
            $params = [$start_date, $end_date];
            $types = "ss";

            if ($server_id) {
                $params[] = $server_id;
                $types .= "i";
            }
            
            $stmt = $conn->prepare($sql);
            $stmt->bind_param($types, ...$params); 
            $stmt->execute();
            $metrics_data = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
            
            $total_served_people = array_sum(array_column($metrics_data, 'served_people'));

            $response = [
                'success' => true, 
                'data' => [
                    'metrics' => $metrics_data, 
                    'total_served' => (int)$total_served_people
                ]
            ];
            break;
            
        case 'get_table_rotation':
             // NUEVO: Reporte de Rotación y Tiempo de Servicio
             // Requiere que la tabla 'sales_history' registre el inicio y fin del servicio.
             $sql = "
                SELECT 
                    AVG(TIMESTAMPDIFF(MINUTE, time_occupied, payment_time)) AS avg_minutes_occupied,
                    COUNT(sale_id) AS total_tables_closed
                FROM 
                    sales_history
                WHERE 
                    payment_time >= ? 
                    AND payment_time < DATE_ADD(?, INTERVAL 1 DAY)
             ";
             $stmt = $conn->prepare($sql);
             $stmt->bind_param("ss", $start_date, $end_date);
             $stmt->execute();
             $report_data = $stmt->get_result()->fetch_assoc();
             $stmt->close();
             
             $response = [
                 'success' => true,
                 'data' => [
                     'avg_time' => number_format($report_data['avg_minutes_occupied'] ?? 0, 0),
                     'total_closed' => (int)$report_data['total_tables_closed']
                 ]
             ];
             break;
             
        case 'get_cancellation_report':
            // NUEVO: Reporte de Cancelaciones por Producto y Razón
            $sql = "
                SELECT 
                    shd.product_name,
                    shd.cancellation_reason,
                    COUNT(shd.sale_detail_id) AS total_canceled_qty,
                    SUM(shd.price_at_order * shd.quantity) AS lost_revenue
                FROM
                    sales_history_details shd
                JOIN
                    sales_history sh ON shd.sale_id = sh.sale_id
                WHERE
                    shd.was_cancelled = TRUE
                    AND sh.payment_time >= ? 
                    AND sh.payment_time < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY
                    shd.product_name, shd.cancellation_reason
                ORDER BY
                    total_canceled_qty DESC, lost_revenue DESC
            ";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ss", $start_date, $end_date);
            $stmt->execute();
            $report_data = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
            
            $response = ['success' => true, 'data' => $report_data];
            break;

        case 'get_reservation_metrics':
            // Reporte 3: Métricas de Ocupación (Basado en Mesas Cerradas)
            // Requiere que la tabla 'orders' tenga la columna 'people_count'.
            $sql = "
                SELECT 
                    COUNT(o.order_id) as total_closed_tables,
                    COALESCE(SUM(o.people_count), 0) as total_people
                FROM 
                    orders o
                WHERE
                    o.status IN ('PAID', 'CLOSED') 
                    AND o.order_time >= ? 
                    AND o.order_time < DATE_ADD(?, INTERVAL 1 DAY)
            ";
            
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ss", $start_date, $end_date);
            $stmt->execute();
            $result = $stmt->get_result();
            $metrics = $result->fetch_assoc();
            $stmt->close();
            
            $total_closed_tables = (int)$metrics['total_closed_tables'];
            $total_people = (int)$metrics['total_people'];
            
            $average_per_table = ($total_closed_tables > 0) ? number_format($total_people / $total_closed_tables, 2) : 0;
            
            $report_data = [
                'total_closed_tables' => $total_closed_tables,
                'total_people' => $total_people,
                'average_per_table' => $average_per_table
            ];

            $response = ['success' => true, 'data' => $report_data];
            break;
            
        case 'get_servers':
            // Función auxiliar para el select (meseros)
            $sql = "SELECT id as user_id, name as user_name FROM users WHERE rol_id = 2 ORDER BY name";
            $result = $conn->query($sql);
            $servers = $result->fetch_all(MYSQLI_ASSOC);
            $response = ['success' => true, 'data' => $servers];
            break;
            
        default:
            http_response_code(400);
            $response['message'] = 'Acción de reporte no válida.';
            break;
    }

} catch (Throwable $e) {
    if (!isset($response['message']) || $response['message'] === 'Error desconocido.') {
        $response['message'] = 'Error en el servidor: ' . $e->getMessage();
    }
    http_response_code(200); 
} finally {
    if (isset($conn)) $conn->close();
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
}
?>