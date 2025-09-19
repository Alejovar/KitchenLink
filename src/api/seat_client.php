<?php
// src/api/seat_client.php
header('Content-Type: application/json');
require '../php/db_connection.php';

$data = json_decode(file_get_contents('php://input'), true);
$clientId = filter_var($data['client_id'] ?? 0, FILTER_VALIDATE_INT);
$tableIds = $data['table_ids'] ?? [];

if (!$clientId || empty($tableIds) || !is_array($tableIds)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos requeridos.']);
    exit();
}

// Iniciar transacción
$conn->begin_transaction();

try {
    // 1. Obtener datos del cliente de la lista de espera
    $stmt_get = $conn->prepare("SELECT * FROM waiting_list WHERE id = ?");
    $stmt_get->bind_param("i", $clientId);
    $stmt_get->execute();
    $client = $stmt_get->get_result()->fetch_assoc();

    if (!$client) {
        throw new Exception("Cliente no encontrado.", 404);
    }

    // 2. Obtener los nombres de las mesas seleccionadas
    $placeholders = implode(',', array_fill(0, count($tableIds), '?'));
    $stmt_tables = $conn->prepare("SELECT table_name FROM tables WHERE id IN ($placeholders)");
    $stmt_tables->bind_param(str_repeat('i', count($tableIds)), ...$tableIds);
    $stmt_tables->execute();
    $tablesResult = $stmt_tables->get_result()->fetch_all(MYSQLI_ASSOC);
    $tableNames = array_column($tablesResult, 'table_name');
    $tableNamesStr = implode(', ', $tableNames);

    // 3. Mover cliente al historial
    $stmt_insert = $conn->prepare(
        "INSERT INTO waiting_list_history (original_id, customer_name, number_of_people, customer_phone, created_at, status, tables_assigned) VALUES (?, ?, ?, ?, ?, 'seated', ?)"
    );
    $stmt_insert->bind_param(
        "isssss",
        $client['id'],
        $client['customer_name'],
        $client['number_of_people'],
        $client['customer_phone'],
        $client['created_at'],
        $tableNamesStr
    );
    $stmt_insert->execute();

    // 4. Actualizar el estado de las mesas a 'ocupado'
    $stmt_update = $conn->prepare("UPDATE tables SET status = 'ocupado', status_changed_at = NOW() WHERE id IN ($placeholders)");
    $stmt_update->bind_param(str_repeat('i', count($tableIds)), ...$tableIds);
    $stmt_update->execute();

    // 5. Eliminar cliente de la lista de espera activa
    $stmt_delete = $conn->prepare("DELETE FROM waiting_list WHERE id = ?");
    $stmt_delete->bind_param("i", $clientId);
    $stmt_delete->execute();

    // Si todo va bien, confirmar cambios
    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'Cliente sentado con éxito.']);

} catch (Exception $e) {
    // Si algo falla, revertir todo
    $conn->rollback();
    $code = $e->getCode() === 404 ? 404 : 500;
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>