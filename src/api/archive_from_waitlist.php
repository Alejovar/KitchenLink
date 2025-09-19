<?php
header('Content-Type: application/json');
require '../php/db_connection.php'; // Ajusta la ruta si es necesario

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
    exit();
}

// Obtener datos del cuerpo JSON de la petición
$data = json_decode(file_get_contents('php://input'), true);
$id = filter_var($data['id'] ?? 0, FILTER_VALIDATE_INT);
$status = $data['status'] ?? '';

// Validar datos de entrada
if (!$id || !in_array($status, ['seated', 'cancelled'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de cliente o estado inválido.']);
    exit();
}

// Iniciar una transacción para garantizar la integridad de los datos
$conn->begin_transaction();

try {
    // 1. Obtener el registro de la lista de espera activa
    $stmt_get = $conn->prepare("SELECT * FROM waiting_list WHERE id = ?");
    $stmt_get->bind_param("i", $id);
    $stmt_get->execute();
    $result = $stmt_get->get_result();
    $client = $result->fetch_assoc();

    if (!$client) {
        throw new Exception("Cliente no encontrado en la lista de espera.", 404);
    }
    
    // 2. Insertar el registro en la tabla de historial
    $stmt_insert = $conn->prepare(
        "INSERT INTO waiting_list_history (original_id, customer_name, number_of_people, customer_phone, created_at, status) VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt_insert->bind_param(
        "isssss",
        $client['id'],
        $client['customer_name'],
        $client['number_of_people'],
        $client['customer_phone'],
        $client['created_at'],
        $status
    );
    $stmt_insert->execute();

    // 3. Eliminar el registro de la lista de espera activa
    $stmt_delete = $conn->prepare("DELETE FROM waiting_list WHERE id = ?");
    $stmt_delete->bind_param("i", $id);
    $stmt_delete->execute();

    // Si todo fue bien, confirmar la transacción
    $conn->commit();

    echo json_encode(['success' => true, 'message' => 'Cliente archivado correctamente.']);

} catch (Exception $e) {
    // Si algo falló, revertir todos los cambios
    $conn->rollback();
    
    // Establecer el código de respuesta HTTP adecuado
    $code = $e->getCode() === 404 ? 404 : 500;
    http_response_code($code);
    
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>