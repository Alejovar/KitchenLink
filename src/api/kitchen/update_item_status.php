<?php
// /src/api/kitchen/update_item_status.php - VERSIÓN FINAL CON GUARDADO EN HISTORIAL

session_start();
header('Content-Type: application/json; charset=utf-8');
// Desactiva la visualización de errores en producción, pero es útil para depurar
// ini_set('display_errors', 1); 
// error_reporting(E_ALL);

$response = ['success' => false, 'message' => 'Error desconocido.'];
$conn = null;

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido.');
    }
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401); // Unauthorized
        throw new Exception("Acceso no autorizado.");
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $detail_id = $data['detail_id'] ?? null;
    $new_status = $data['new_status'] ?? null;

    if (empty($detail_id) || empty($new_status)) {
        http_response_code(400); // Bad Request
        throw new Exception("Faltan parámetros: ID de detalle o nuevo estado.");
    }
    
    $allowed_statuses = ['EN_PREPARACION', 'LISTO'];
    if (!in_array($new_status, $allowed_statuses)) {
        http_response_code(400);
        throw new Exception("Estado no válido proporcionado.");
    }

    require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php';
    
    // ===================================================================
    // INICIO DE LA LÓGICA DE HISTORIAL
    // ===================================================================

    if ($new_status === 'LISTO') {
        // Al marcar como 'LISTO', realizamos una transacción segura para guardar en el historial.
        $conn->begin_transaction();

        try {
            // 1. Obtenemos todos los datos necesarios para el historial.
            $sql_select = "
                SELECT 
                    od.order_id, 
                    rt.table_number, 
                    od.batch_timestamp,
                    od.service_time,
                    p.name as product_name,
                    od.quantity, 
                    od.special_notes, 
                    u.name as server_name, 
                    od.added_at as timestamp_added,
                    od.preparation_area
                FROM order_details od
                JOIN orders o ON od.order_id = o.order_id
                JOIN restaurant_tables rt ON o.table_id = rt.table_id
                JOIN users u ON o.server_id = u.id
                JOIN products p ON od.product_id = p.product_id
                WHERE od.detail_id = ?
            ";
            $stmt_select = $conn->prepare($sql_select);
            $stmt_select->bind_param("i", $detail_id);
            $stmt_select->execute();
            $result = $stmt_select->get_result();
            $item_data = $result->fetch_assoc();
            $stmt_select->close();

            if (!$item_data) {
                throw new Exception("No se encontró el ítem con ID " . $detail_id);
            }

            // 2. Decidimos en qué tabla de historial guardar.
            $history_table = null;
            if ($item_data['preparation_area'] === 'COCINA') {
                $history_table = 'kitchen_production_history';
            } elseif ($item_data['preparation_area'] === 'BARRA') {
                // Si vas a crear historial de barra, aquí iría:
                // $history_table = 'bar_production_history'; 
            }

            // 3. Insertamos el registro en la tabla de historial correspondiente.
            if ($history_table) {
                $sql_insert = "
                    INSERT INTO $history_table 
                        (original_detail_id, order_id, table_number, batch_timestamp, service_time, server_name, product_name, quantity, special_notes, timestamp_added) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ";
                $stmt_insert = $conn->prepare($sql_insert);
                $stmt_insert->bind_param(
                    "iiisississ",
                    $detail_id,
                    $item_data['order_id'],
                    $item_data['table_number'],
                    $item_data['batch_timestamp'],
                    $item_data['service_time'],
                    $item_data['server_name'],
                    $item_data['product_name'],
                    $item_data['quantity'],
                    $item_data['special_notes'],
                    $item_data['timestamp_added']
                );
                $stmt_insert->execute();
                $stmt_insert->close();
            }

            // 4. Actualizamos el estado y la fecha de finalización en la tabla original.
            $sql_update = "UPDATE order_details SET item_status = ?, completed_at = NOW() WHERE detail_id = ?";
            $stmt_update = $conn->prepare($sql_update);
            $stmt_update->bind_param("si", $new_status, $detail_id);
            $stmt_update->execute();
            $stmt_update->close();

            // 5. Si todo fue exitoso, confirmamos la transacción.
            $conn->commit();
            $response = ['success' => true, 'message' => 'Ítem finalizado y guardado en historial.'];

        } catch (Throwable $e) {
            // Si algo falla, revertimos todos los cambios.
            $conn->rollback();
            throw $e; // Re-lanzamos la excepción para que sea capturada por el bloque principal.
        }

    } else {
        // Si el estado no es 'LISTO' (ej. 'EN_PREPARACION'), solo hacemos la actualización simple.
        $sql = "UPDATE order_details SET item_status = ? WHERE detail_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("si", $new_status, $detail_id);

        if ($stmt->execute()) {
            $response = ['success' => true, 'message' => 'Estado actualizado con éxito.'];
        } else {
            throw new Exception("Error al actualizar la base de datos.");
        }
        $stmt->close();
    }

} catch (Throwable $e) {
    http_response_code(500);
    $response = ['success' => false, 'message' => $e->getMessage()];
} finally {
    if ($conn) $conn->close();
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit;