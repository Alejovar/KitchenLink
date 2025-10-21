<?php
// /src/api/kitchen/update_item_status.php - CORREGIDO PARA ACEPTAR ESTADO DIRECTO

session_start();
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL);

$response = ['success' => false, 'message' => 'Error desconocido.'];
$conn = null;

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido.');
    }
    if (!isset($_SESSION['user_id'])) {
        throw new Exception("Acceso no autorizado.");
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $detail_id = $data['detail_id'] ?? null;
    $new_status = $data['new_status'] ?? null;

    if (empty($detail_id) || empty($new_status)) {
        throw new Exception("Faltan parámetros: ID de detalle o nuevo estado.");
    }
    
    // Lista de estados permitidos para evitar inyecciones
    $allowed_statuses = ['EN_PREPARACION', 'LISTO'];
    if (!in_array($new_status, $allowed_statuses)) {
        throw new Exception("Estado no válido proporcionado.");
    }

    require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';

    $sql = "UPDATE order_details SET item_status = ? WHERE detail_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("si", $new_status, $detail_id);

    if ($stmt->execute()) {
        $response = ['success' => true, 'message' => 'Estado actualizado con éxito.'];
    } else {
        throw new Exception("Error al actualizar la base de datos.");
    }
    $stmt->close();

} catch (Throwable $e) {
    http_response_code(500);
    $response = ['success' => false, 'message' => $e->getMessage()];
} finally {
    if ($conn) $conn->close();
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit;