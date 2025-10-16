<?php
// /api/orders/pending_orders/get_pending_orders.php
// VERSIÓN FINAL CON ORDEN ESTABLE DE PRODUCTOS

header('Content-Type: application/json');
require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';

try {
    $sql = "
        SELECT
            rt.table_number,
            od.batch_timestamp,
            o.status,
            GROUP_CONCAT(
                CONCAT(p.name, IF(m.modifier_name IS NOT NULL, CONCAT(' (', m.modifier_name, ')'), ''))
                ORDER BY od.detail_id ASC -- ¡AQUÍ ESTÁ EL AJUSTE 1!
                SEPARATOR '|'
            ) AS item_names,
            GROUP_CONCAT(
                od.quantity 
                ORDER BY od.detail_id ASC -- ¡AQUÍ ESTÁ EL AJUSTE 2!
                SEPARATOR '|'
            ) AS item_quantities
        FROM order_details od
        JOIN products p ON od.product_id = p.product_id
        JOIN orders o ON od.order_id = o.order_id
        JOIN restaurant_tables rt ON o.table_id = rt.table_id
        LEFT JOIN modifiers m ON od.modifier_id = m.modifier_id
        WHERE o.status = 'PENDING'
        GROUP BY rt.table_number, od.batch_timestamp
        ORDER BY od.batch_timestamp ASC;
    ";

    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $result = $stmt->get_result();

    $orders_by_batch = [];
    while ($row = $result->fetch_assoc()) {
        $item_names = $row['item_names'] ? explode('|', $row['item_names']) : [];
        $item_quantities = $row['item_quantities'] ? explode('|', $row['item_quantities']) : [];

        $items_details = [];
        for ($i = 0; $i < count($item_names); $i++) {
            $items_details[] = [
                'name' => htmlspecialchars($item_names[$i]),
                'quantity' => (int)$item_quantities[$i]
            ];
        }

        $orders_by_batch[] = [
            'table_number' => $row['table_number'],
            'order_time' => (new DateTime($row['batch_timestamp']))->format(DateTime::ATOM),
            'items' => $items_details
        ];
    }

    $response = [
        'server_time' => (new DateTime())->format(DateTime::ATOM),
        'orders' => $orders_by_batch
    ];

    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en el servidor: ' . $e->getMessage()]);
}

$conn->close();
?>