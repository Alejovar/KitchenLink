<?php
header('Content-Type: application/json');
require __DIR__ . '/../php/db_connection.php';

$date = $_GET['date'] ?? date('Y-m-d');

// La consulta con GROUP_CONCAT se mantiene, pero ahora con mejor manejo de errores.
$sql = "SELECT
            r.id, r.customer_name, r.customer_phone, r.reservation_time,
            r.number_of_people, r.special_requests, u.name AS hostess_name,
            GROUP_CONCAT(t.table_name ORDER BY t.table_name SEPARATOR ', ') AS table_names
        FROM reservations AS r
        LEFT JOIN users AS u ON r.hostess_id = u.id
        LEFT JOIN reservation_tables AS rt ON r.id = rt.reservation_id
        LEFT JOIN tables AS t ON rt.table_id = t.id
        WHERE r.reservation_date = ?
        GROUP BY r.id
        ORDER BY r.reservation_time ASC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $date);
$stmt->execute();
$result = $stmt->get_result();

// Manejo de errores en la consulta
if (!$result) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error en la consulta de reservaciones: ' . $conn->error]);
    exit();
}

$reservations = [];
while($row = $result->fetch_assoc()) {
    // Si no hay mesas asignadas (aunque no debería pasar), mostramos un texto por defecto.
    if ($row['table_names'] === null) {
        $row['table_names'] = 'Ninguna asignada';
    }
    $reservations[] = $row;
}

echo json_encode($reservations);
$conn->close();
?>