<?php
header('Content-Type: application/json');
session_start();
require __DIR__ . '/../php/db_connection.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Acceso denegado.']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);
$reservation_id = $data['reservation_id'] ?? 0;
$final_status = $data['status'] ?? '';

if ($reservation_id <= 0 || !in_array($final_status, ['completada', 'cancelada'])) {
    echo json_encode(['success' => false, 'message' => 'Datos inválidos.']);
    exit();
}

$conn->begin_transaction();
try {
    $stmt = $conn->prepare("SELECT * FROM reservations WHERE id = ?");
    if ($stmt === false) throw new Exception("Error al preparar SELECT reservations: " . $conn->error);
    $stmt->bind_param("i", $reservation_id);
    $stmt->execute();
    $reservation = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$reservation) throw new Exception("Reservación no encontrada.");
    
    $stmt_get_tables = $conn->prepare("SELECT table_id FROM reservation_tables WHERE reservation_id = ?");
    if ($stmt_get_tables === false) throw new Exception("Error al preparar SELECT reservation_tables: " . $conn->error);
    $stmt_get_tables->bind_param("i", $reservation_id);
    $stmt_get_tables->execute();
    $tables_result = $stmt_get_tables->get_result();
    $table_ids = [];
    while($row = $tables_result->fetch_assoc()){
        $table_ids[] = $row['table_id'];
    }
    $stmt_get_tables->close();

    $stmt_history = $conn->prepare(
        "INSERT INTO reservations_history (original_reservation_id, hostess_id, table_id, customer_name, customer_phone, reservation_date, reservation_time, number_of_people, special_requests, created_at, final_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    if ($stmt_history === false) throw new Exception("Error al preparar INSERT_HISTORY: " . $conn->error);
    foreach ($table_ids as $table_id) {
        $stmt_history->bind_param("iiissssisss", 
            $reservation['id'], $reservation['hostess_id'], $table_id, $reservation['customer_name'], 
            $reservation['customer_phone'], $reservation['reservation_date'], $reservation['reservation_time'], 
            $reservation['number_of_people'], $reservation['special_requests'], $reservation['created_at'], $final_status
        );
        $stmt_history->execute();
    }
    $stmt_history->close();
    
    if ($final_status === 'completada' && count($table_ids) > 0) {
        $reservation_start_timestamp = $reservation['reservation_date'] . ' ' . $reservation['reservation_time'];
        $ids_placeholder = implode(',', array_fill(0, count($table_ids), '?'));
        $stmt_update = $conn->prepare("UPDATE tables SET status = 'ocupado', status_changed_at = ? WHERE id IN ($ids_placeholder)");
        if ($stmt_update === false) throw new Exception("Error al preparar UPDATE_TABLES: " . $conn->error);
        $types = 's' . str_repeat('i', count($table_ids));
        $params = array_merge([$reservation_start_timestamp], $table_ids);
        $stmt_update->bind_param($types, ...$params);
        $stmt_update->execute();
        $stmt_update->close();
    }

    $stmt_delete_rt = $conn->prepare("DELETE FROM reservation_tables WHERE reservation_id = ?");
    if ($stmt_delete_rt === false) throw new Exception("Error al preparar DELETE_RT: " . $conn->error);
    $stmt_delete_rt->bind_param("i", $reservation_id);
    $stmt_delete_rt->execute();
    $stmt_delete_rt->close();
    $stmt_delete_r = $conn->prepare("DELETE FROM reservations WHERE id = ?");
    if ($stmt_delete_r === false) throw new Exception("Error al preparar DELETE_R: " . $conn->error);
    $stmt_delete_r->bind_param("i", $reservation_id);
    $stmt_delete_r->execute();
    $stmt_delete_r->close();
    
    $conn->commit();
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
$conn->close();
?>