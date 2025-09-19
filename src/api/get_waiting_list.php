<?php
header('Content-Type: application/json');
require '../php/db_connection.php'; // Ajusta la ruta si es necesario

try {
    // 👇 CAMBIO AQUÍ: Se agregó 'customer_phone' a la consulta
    $stmt = $conn->prepare("SELECT id, customer_name, number_of_people, customer_phone FROM waiting_list ORDER BY created_at ASC");
    $stmt->execute();
    $result = $stmt->get_result();
    $clients = $result->fetch_all(MYSQLI_ASSOC);

    echo json_encode($clients);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
}

$conn->close();
?>