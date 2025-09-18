<?php
header('Content-Type: application/json');
require __DIR__ . '/../php/db_connection.php';

// Establece la zona horaria para evitar desfases
date_default_timezone_set('America/Mexico_City');

$date = $_GET['date'] ?? '';
$time = $_GET['time'] ?? '';

if (empty($date) || empty($time)) {
    echo json_encode([]);
    exit();
}

$today = date('Y-m-d');
$full_datetime_string = $date . ' ' . $time;

// 1. Excluir mesas con reservaciones futuras que chocan directamente
$sql = "SELECT id, table_name 
        FROM tables
        WHERE id NOT IN (
            SELECT table_id 
            FROM reservation_tables rt
            JOIN reservations r ON rt.reservation_id = r.id
            WHERE r.reservation_date = ? AND r.reservation_time = ?
        )";

// 2. Lógica condicional predictiva
if ($date === $today) {
    // Si la nueva reservación es para hoy, predice la liberación de mesas ocupadas
    $sql .= " AND (status = 'disponible' OR (status = 'ocupado' AND ADDTIME(status_changed_at, '06:00:00') <= ?))";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sss", $date, $time, $full_datetime_string);

} else {
    // Si la nueva reservación es para un día futuro, el estado actual 'ocupado' es irrelevante
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $date, $time);
}

$stmt->execute();
$result = $stmt->get_result();

$tables = [];
while($row = $result->fetch_assoc()) {
    $tables[] = $row;
}

echo json_encode($tables);
$stmt->close();
$conn->close();
?>