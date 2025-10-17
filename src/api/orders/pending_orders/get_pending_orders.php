<?php
// /api/orders/pending_orders/get_pending_orders.php
// VERSIÓN FINAL - FILTRADO POR MESERO

session_start(); // 1. Iniciamos la sesión para saber quién es el usuario
header('Content-Type: application/json');

// 2. Seguridad: Verificamos si el usuario está logueado y es un mesero (rol_id = 2)
if (!isset($_SESSION['user_id']) || $_SESSION['rol_id'] != 2) {
    http_response_code(403); // Código de "Acceso Prohibido"
    echo json_encode(['error' => 'Acceso denegado.']);
    exit();
}

// 3. Obtenemos el ID del mesero de la sesión
$server_id = $_SESSION['user_id'];

require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';

try {
    // 4. Se modifica la consulta SQL para añadir el filtro por 'server_id'
    $sql = "
        SELECT
            rt.table_number,
            od.batch_timestamp,
            o.status,
            GROUP_CONCAT(
                CONCAT(p.name, IF(m.modifier_name IS NOT NULL, CONCAT(' (', m.modifier_name, ')'), ''))
                ORDER BY od.detail_id ASC
                SEPARATOR '|'
            ) AS item_names,
            GROUP_CONCAT(
                od.quantity 
                ORDER BY od.detail_id ASC
                SEPARATOR '|'
            ) AS item_quantities
        FROM order_details od
        JOIN products p ON od.product_id = p.product_id
        JOIN orders o ON od.order_id = o.order_id
        JOIN restaurant_tables rt ON o.table_id = rt.table_id
        LEFT JOIN modifiers m ON od.modifier_id = m.modifier_id
        WHERE o.status = 'PENDING' AND o.server_id = ? -- ¡ESTE ES EL CAMBIO CLAVE!
        GROUP BY rt.table_number, od.batch_timestamp
        ORDER BY od.batch_timestamp ASC;
    ";

    $stmt = $conn->prepare($sql);
    // 5. Se vincula el ID del mesero a la consulta para evitar inyección SQL
    $stmt->bind_param("i", $server_id);
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