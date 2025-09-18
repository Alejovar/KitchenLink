<?php
header('Content-Type: application/json');
require __DIR__ . '/../php/db_connection.php';

$data = json_decode(file_get_contents('php://input'), true);
$table_id = $data['table_id'] ?? 0;

if ($table_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'ID de mesa inválido.']);
    exit();
}

$conn->begin_transaction();
try {
    $stmt = $conn->prepare("SELECT status FROM tables WHERE id = ? FOR UPDATE");
    $stmt->bind_param("i", $table_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) throw new Exception("La mesa no fue encontrada.");
    
    $current_status = $result->fetch_assoc()['status'];
    $stmt->close();
    
    $new_status = ($current_status === 'disponible') ? 'ocupado' : 'disponible';
    
    // Aquí se guarda la hora actual, iniciando el conteo de 6 horas
    $stmt = $conn->prepare("UPDATE tables SET status = ?, status_changed_at = NOW() WHERE id = ?");
    $stmt->bind_param("si", $new_status, $table_id);
    
    if (!$stmt->execute()) throw new Exception("No se pudo actualizar el estado.");
    $stmt->close();

    $conn->commit();
    echo json_encode(['success' => true, 'new_status' => $new_status]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
$conn->close();
?>