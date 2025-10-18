<?php
// /api/orders/pending_orders/get_pending_orders.php
// VERSIÓN FINAL Y SEGURA: Agrupa por el tiempo exacto de inserción para simular el lote (Comanda).

session_start();
// Define el huso horario para PHP.
date_default_timezone_set('America/Mexico_City'); 
header('Content-Type: application/json; charset=utf-8');

// 1. Seguridad
if (!isset($_SESSION['user_id']) || $_SESSION['rol_id'] != 2) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Acceso denegado.'], JSON_UNESCAPED_UNICODE);
    exit();
}

$server_id = $_SESSION['user_id'];

// Conexión
require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';

try {
    $final_statuses = ['PAGADA', 'CANCELADA', 'CLOSED']; 
    $status_placeholders = str_repeat('?,', count($final_statuses) - 1) . '?';
    $status_types = str_repeat('s', count($final_statuses));

    // 🚨 CONSULTA FINAL Y SEGURA: Agrupa por la columna added_at (tiempo de lote). 🚨
    $sql = "
        SELECT
            rt.table_number,
            o.order_id,
            
            -- 🔑 TIEMPO DE REFERENCIA: Usamos MIN(od.added_at) para el tiempo de inicio confiable.
            MIN(od.added_at) AS order_start_time, 

            -- Estado de Cocina (Kitchen)
            SUM(CASE WHEN od.preparation_area = 'COCINA' AND od.item_status IN ('PENDIENTE', 'EN_PREPARACION') THEN 1 ELSE 0 END) AS kitchen_pending_items,
            SUM(CASE WHEN od.preparation_area = 'COCINA' AND od.item_status = 'LISTO' THEN 1 ELSE 0 END) AS kitchen_ready_items,
            
            -- CONTEO ACTIVO: Cuenta CUALQUIER ítem que NO sea CANCELADO O COMPLETADO.
            SUM(CASE WHEN od.preparation_area = 'COCINA' AND od.item_status NOT IN ('CANCELADO', 'COMPLETADO') THEN 1 ELSE 0 END) AS total_kitchen_active_items,

            -- Estado de Barra (Bar)
            SUM(CASE WHEN od.preparation_area = 'BARRA' AND od.item_status IN ('PENDIENTE', 'EN_PREPARACION') THEN 1 ELSE 0 END) AS bar_pending_items,
            SUM(CASE WHEN od.preparation_area = 'BARRA' AND od.item_status = 'LISTO' THEN 1 ELSE 0 END) AS bar_ready_items,
            SUM(CASE WHEN od.preparation_area = 'BARRA' AND od.item_status NOT IN ('CANCELADO', 'COMPLETADO') THEN 1 ELSE 0 END) AS total_bar_active_items
            
        FROM orders o
        JOIN restaurant_tables rt ON o.table_id = rt.table_id
        JOIN order_details od ON o.order_id = od.order_id
        
        WHERE 
            o.server_id = ? 
            AND o.status NOT IN ({$status_placeholders}) 
            AND od.is_cancelled = FALSE 
            AND od.item_status != 'COMPLETADO' 
            
            -- Filtro de fechas inválidas.
            AND od.added_at IS NOT NULL
            AND od.added_at != '0000-00-00 00:00:00'
        
        -- 🔑 SOLUCIÓN AL ERROR 500: Agrupamos por la columna rt.table_number, o.order_id Y la columna added_at.
        -- Ya que added_at tiene un valor distinto para cada lote, esto simula el GROUP BY por lote/tiempo.
        GROUP BY rt.table_number, o.order_id, od.added_at
        
        ORDER BY order_start_time ASC;
    ";

    $stmt = $conn->prepare($sql);
    
    $bind_params = array_merge([$server_id], $final_statuses);
    $stmt->bind_param("i" . $status_types, ...$bind_params); 
    
    $stmt->execute();
    $result = $stmt->get_result();

    $orders_summary = [];
    while ($row = $result->fetch_assoc()) {
        
        // Solo si hay ítems activos, se muestra la orden/lote.
        if ((int)$row['total_kitchen_active_items'] > 0 || (int)$row['total_bar_active_items'] > 0) {
            
            $startTime = $row['order_start_time']; 
            
            if (!$startTime) {
                 $timestamp_atom = (new DateTime('now'))->format(DateTime::ATOM);
            } else {
                 $timestamp_atom = (new DateTime($startTime))->format(DateTime::ATOM);
            }

            $orders_summary[] = [
                'table_number' => (int)$row['table_number'],
                'order_id' => (int)$row['order_id'],
                // Mantenemos 'batch_timestamp' como NOMBRE de la variable para el JS
                'batch_timestamp' => $timestamp_atom, 
                
                'kitchen_pending' => (int)$row['kitchen_pending_items'],
                'kitchen_ready' => (int)$row['kitchen_ready_items'],
                'total_kitchen_active' => (int)$row['total_kitchen_active_items'],

                'bar_pending' => (int)$row['bar_pending_items'],
                'bar_ready' => (int)$row['bar_ready_items'],
                'total_bar_active' => (int)$row['total_bar_active_items']
            ];
        }
    }
    $stmt->close();

    $response = [
        'success' => true,
        'server_time' => (new DateTime())->format(DateTime::ATOM), 
        'orders_summary' => $orders_summary
    ];

    echo json_encode($response, JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Error fatal en get_pending_orders.php: " . $e->getMessage()); 
    echo json_encode(['success' => false, 'error' => 'Error de servidor: No se pudo procesar la solicitud.'], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>