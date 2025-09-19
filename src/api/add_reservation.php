<?php
header('Content-Type: application/json');
session_start();
require __DIR__ . '/../php/db_connection.php';

// --- VERIFICACIONES INICIALES ---
if (!isset($_SESSION['user_id'])) {
    http_response_code(401); // Unauthorized
    echo json_encode(['success' => false, 'message' => 'Acceso denegado. Tu sesión pudo haber expirado.']);
    exit();
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
    exit();
}

// --- RECOLECCIÓN DE DATOS ---
$table_ids = $_POST['table_ids'] ?? [];
$hostess_id = $_SESSION['user_id'];
$customer_name = trim($_POST['customer_name'] ?? '');
$reservation_date = $_POST['reservation_date'] ?? '';
$reservation_time = $_POST['reservation_time'] ?? '';
$number_of_people = trim($_POST['number_of_people'] ?? '');
$customer_phone = trim($_POST['customer_phone'] ?? '');
$special_requests = trim($_POST['special_requests'] ?? '');

// --- BLOQUE DE VALIDACIÓN DEL SERVIDOR ---

if (empty($table_ids) || empty($customer_name) || empty($reservation_date) || empty($reservation_time) || empty($number_of_people)) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'message' => 'Faltan datos requeridos (Fecha, Hora, Mesas, Nombre o N° de Personas).']);
    exit();
}

// Validar formatos de texto y número
if (!preg_match('/^[a-zA-Z\s]+$/', $customer_name)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'El nombre solo puede contener letras y espacios.']);
    exit();
}
if (!preg_match('/^[0-9]{1,2}$/', $number_of_people) || (int)$number_of_people == 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'El número de personas debe ser entre 1 y 99.']);
    exit();
}
if (!empty($customer_phone) && !preg_match('/^[0-9]{1,10}$/', $customer_phone)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'El teléfono debe contener máximo 10 dígitos.']);
    exit();
}

// Validar lógica de fecha y hora
try {
    // Es crucial definir la zona horaria para evitar errores de comparación
    $timezone = new DateTimeZone('America/Mexico_City');
    $reservationDateTime = new DateTime($reservation_date . ' ' . $reservation_time, $timezone);
    $now = new DateTime('now', $timezone);
    $reservationTime = $reservationDateTime->format('H:i:s');

    if ($reservationDateTime < $now) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No se puede reservar en una fecha y hora pasadas.']);
        exit();
    }

    if ($reservationTime < '08:00:00' || $reservationTime > '22:00:00') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Las reservaciones son solo de 8:00 AM a 10:00 PM.']);
        exit();
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'El formato de fecha u hora es inválido.']);
    exit();
}

// --- TRANSACCIÓN EN LA BASE DE DATOS ---

$conn->begin_transaction();
try {
    $stmt_reservations = $conn->prepare(
        "INSERT INTO reservations (hostess_id, customer_name, customer_phone, reservation_date, reservation_time, number_of_people, special_requests) 
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    if ($stmt_reservations === false) throw new Exception("Error al preparar la consulta de reservación: " . $conn->error);
    
    $stmt_reservations->bind_param("issssis", $hostess_id, $customer_name, $customer_phone, $reservation_date, $reservation_time, $number_of_people, $special_requests);
    $stmt_reservations->execute();
    $reservation_id = $conn->insert_id;
    $stmt_reservations->close();

    if ($reservation_id <= 0) throw new Exception("No se pudo crear el registro de reservación principal.");
    
    $stmt_tables = $conn->prepare("INSERT INTO reservation_tables (reservation_id, table_id) VALUES (?, ?)");
    if ($stmt_tables === false) throw new Exception("Error al preparar la consulta de mesas: " . $conn->error);

    foreach ($table_ids as $table_id) {
        $stmt_tables->bind_param("ii", $reservation_id, $table_id);
        $stmt_tables->execute();
    }
    $stmt_tables->close();
    
    $conn->commit();
    echo json_encode(['success' => true]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500); // Internal Server Error
    echo json_encode(['success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage()]);
}

$conn->close();
?>