<?php
// Le decimos al navegador que vamos a devolver un JSON.
header('Content-Type: application/json');
// Incluimos el archivo para conectarnos a la base de datos.
require __DIR__ . '/../php/db_connection.php';

// Obtenemos la fecha de la URL. Si no viene ninguna, usamos la de hoy por defecto.
$date = $_GET['date'] ?? date('Y-m-d');

// --- La Consulta Principal ---
// Este query es el corazón del script. Su objetivo es traer toda la info de las reservaciones
// de un día específico, incluyendo el nombre del hostess y una lista de todas las mesas asignadas.
$sql = "SELECT
            r.id, r.customer_name, r.customer_phone, r.reservation_time,
            r.number_of_people, r.special_requests, u.name AS hostess_name,
            -- La magia está aquí: GROUP_CONCAT junta los nombres de todas las mesas de una reserva en un solo texto.
            GROUP_CONCAT(t.table_name ORDER BY t.table_name SEPARATOR ', ') AS table_names
        FROM reservations AS r
        -- Unimos las tablas para poder obtener los nombres en lugar de solo los IDs.
        LEFT JOIN users AS u ON r.hostess_id = u.id
        LEFT JOIN reservation_tables AS rt ON r.id = rt.reservation_id
        LEFT JOIN tables AS t ON rt.table_id = t.id
        WHERE r.reservation_date = ?
        -- Agrupamos por reservación para que GROUP_CONCAT funcione correctamente.
        GROUP BY r.id
        ORDER BY r.reservation_time ASC";

// Preparamos y ejecutamos la consulta de forma segura para evitar inyecciones SQL.
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $date);
$stmt->execute();
$result = $stmt->get_result();

// Checamos por si la consulta falló por alguna razón (ej. un error de sintaxis).
if (!$result) {
    http_response_code(500); // Error del servidor
    echo json_encode(['success' => false, 'message' => 'Error en la consulta de reservaciones: ' . $conn->error]);
    exit();
}

// Procesamos los resultados para mandarlos al cliente.
$reservations = [];
while($row = $result->fetch_assoc()) {
    // Un pequeño seguro: si una reserva se quedó sin mesas por error, le ponemos un texto para que no se vea vacío.
    if ($row['table_names'] === null) {
        $row['table_names'] = 'Ninguna asignada';
    }
    $reservations[] = $row;
}

// Devolvemos el array de reservaciones como JSON.
echo json_encode($reservations);

// Cerramos la conexión. ¡Nos vemos!
$conn->close();
?>