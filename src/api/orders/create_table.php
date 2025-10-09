<?php
// create_table.php - Endpoint AJAX final para crear mesas

session_start();
header('Content-Type: application/json');

// CRÍTICO: Incluye tu archivo de conexión MySQLi
require '../../php/db_connection.php'; 

// 1. VERIFICAR AUTENTICACIÓN
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Error: Sesión no válida o no autenticada.']);
    exit();
}
$server_id = $_SESSION['user_id']; 

// 2. OBTENER Y VALIDAR DATOS (Ambos campos)
$data = json_decode(file_get_contents('php://input'), true);

$table_number = filter_var($data['table_number'] ?? null, FILTER_VALIDATE_INT);
$client_count = filter_var($data['client_count'] ?? null, FILTER_VALIDATE_INT);

// 3. VALIDACIÓN DE RANGOS FINALES (CRÍTICO)
$min_table = 1; $max_table = 9999;
$min_client = 1; $max_client = 99;

if (!is_numeric($table_number) || $table_number < $min_table || $table_number > $max_table) {
    http_response_code(400); 
    echo json_encode(['success' => false, 'message' => "Error de validación: El número de mesa debe ser entre $min_table y $max_table."]);
    exit();
}

if (!is_numeric($client_count) || $client_count < $min_client || $client_count > $max_client) {
    http_response_code(400); 
    echo json_encode(['success' => false, 'message' => "Error de validación: El número de personas debe ser entre $min_client y $max_client."]);
    exit();
}


// 4. PASO 1: Verificar Unicidad Global
$sql_check = "SELECT COUNT(table_id) FROM restaurant_tables WHERE table_number = ?";
$stmt_check = $conn->prepare($sql_check);
$stmt_check->bind_param("i", $table_number);
$stmt_check->execute();
$stmt_check->bind_result($is_duplicate);
$stmt_check->fetch();
$stmt_check->close();

if ($is_duplicate > 0) {
    http_response_code(409); 
    echo json_encode(['success' => false, 'message' => "El número de mesa {$table_number} ya está en uso."]);
    exit();
}


// 5. PASO 2: Insertar la Mesa y Asignarla (assigned_server_id)
$sql_insert = "INSERT INTO restaurant_tables (table_number, assigned_server_id, client_count) 
               VALUES (?, ?, ?)";

try {
    $stmt_insert = $conn->prepare($sql_insert);
    // 'iii' vincula table_number, server_id, y client_count
    $stmt_insert->bind_param("iii", $table_number, $server_id, $client_count); 
    $stmt_insert->execute();
    $stmt_insert->close();

    echo json_encode(['success' => true, 'message' => "Mesa {$table_number} creada con {$client_count} personas."]);

} catch (\Exception $e) {
    error_log("DB Insertion Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al guardar la mesa en la base de datos.']);
}
?>