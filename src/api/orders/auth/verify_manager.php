<?php
// =====================================================
// VERIFY_MANAGER.PHP - versión estable corregida (Adellya)
// =====================================================

// Evita que errores HTML rompan el JSON
ob_clean();
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");

// Activar errores solo durante pruebas
ini_set('display_errors', 1);
error_reporting(E_ALL);

session_start();

define('MANAGER_ROLE_ID', 1);

// Estructura base de respuesta
$response = [
    'success' => false,
    'message' => 'Contraseña no válida.'
];

// =====================================================
// 1. Obtener la contraseña enviada por JS
// =====================================================
$data = json_decode(file_get_contents('php://input'), true);
$password = $data['password'] ?? '';

if (empty($password)) {
    $response['message'] = 'Por favor, ingrese una contraseña.';
    echo json_encode($response);
    exit();
}

// =====================================================
// 2. Conexión a la Base de Datos
// =====================================================
try {
    // Detectamos DOCUMENT_ROOT real
    $rootPath = rtrim($_SERVER['DOCUMENT_ROOT'], '/');

    // En Adellya normalmente public_html es el root, por eso probamos ambos
    $dbPath1 = $rootPath . '/KitchenLink/src/php/db_connection.php';
    $dbPath2 = $rootPath . '/src/php/db_connection.php';

    if (file_exists($dbPath1)) {
        require $dbPath1;
    } elseif (file_exists($dbPath2)) {
        require $dbPath2;
    } else {
        throw new Exception("No se encontró db_connection.php en:\n$dbPath1\n$dbPath2");
    }

    if (!isset($conn) || !$conn) {
        throw new Exception("La variable \$conn no está definida o la conexión falló.");
    }

} catch (Throwable $e) {
    http_response_code(500);
    $response = [
        'success' => false,
        'message' => 'Error al conectar con la base de datos.',
        'error_details' => $e->getMessage(),
        'root' => $_SERVER['DOCUMENT_ROOT']
    ];
    echo json_encode($response);
    exit();
}

// =====================================================
// 3. Verificación de la contraseña
// =====================================================
try {
    $sql = "SELECT password FROM users WHERE rol_id = ?";
    $stmt = $conn->prepare($sql);

    if ($stmt === false) {
        throw new Exception("Error al preparar la consulta SQL: " . $conn->error);
    }

    // ✅ Corrección: pasar variable, no constante, a bind_param
    $roleId = MANAGER_ROLE_ID;
    $stmt->bind_param("i", $roleId);

    $stmt->execute();
    $result = $stmt->get_result();

    $is_verified = false;

    while ($manager = $result->fetch_assoc()) {
        if (password_verify($password, $manager['password'])) {
            $is_verified = true;
            break;
        }
    }

    if ($is_verified) {
        $response['success'] = true;
        $response['message'] = 'Verificación exitosa.';
    } else {
        $response['message'] = 'Contraseña no válida.';
    }

    $stmt->close();

} catch (Throwable $e) {
    http_response_code(500);
    $response = [
        'success' => false,
        'message' => 'Error en el servidor durante la ejecución de la consulta.',
        'error_details' => $e->getMessage()
    ];
    echo json_encode($response);
    exit();
}

// =====================================================
// 4. Cerrar conexión y responder
// =====================================================
if (isset($conn)) {
    $conn->close();
}

echo json_encode($response);
exit();
?>
