<?php
header('Content-Type: application/json');
session_start();
require __DIR__ . '/../php/db_connection.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Acceso denegado. Tu sesión pudo haber expirado.']);
    exit();
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
    exit();
}

$table_ids = $_POST['table_ids'] ?? [];
$hostess_id = $_SESSION['user_id'];
$customer_name = trim($_POST['customer_name'] ?? '');
$reservation_date = $_POST['reservation_date'] ?? '';
$reservation_time = $_POST['reservation_time'] ?? '';
$number_of_people = $_POST['number_of_people'] ?? 0;
$customer_phone = trim($_POST['customer_phone'] ?? '');
$special_requests = trim($_POST['special_requests'] ?? '');

if (empty($table_ids) || empty($customer_name) || empty($reservation_date) || empty($reservation_time) || empty($number_of_people)) {
    echo json_encode(['success' => false, 'message' => 'Faltan datos requeridos (Fecha, Hora, Mesas, Nombre o N° de Personas).']);
    exit();
}

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