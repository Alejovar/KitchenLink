<?php
// src/api/add_to_waitlist.php

header('Content-Type: application/json');
require '../php/db_connection.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
    exit();
}

$name = trim($_POST['customer_name'] ?? '');
$people = trim($_POST['number_of_people'] ?? '');
$phone = trim($_POST['customer_phone'] ?? '');

// --- BLOQUE DE VALIDACIÓN DEL SERVIDOR ---

// 1. Validar Nombre: solo letras y espacios, no vacío.
if (!preg_match('/^[a-zA-Z\s]+$/', $name)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'El nombre del cliente solo puede contener letras y espacios.']);
    exit();
}

// 2. Validar Personas: solo 1 o 2 dígitos numéricos.
if (!preg_match('/^[0-9]{1,2}$/', $people) || (int)$people == 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'El número de personas debe ser un número entre 1 y 99.']);
    exit();
}

// 3. Validar Teléfono (si no está vacío): solo números, máximo 10.
if (!empty($phone) && !preg_match('/^[0-9]{1,10}$/', $phone)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'El teléfono solo puede contener números y un máximo de 10 dígitos.']);
    exit();
}
// --- FIN DEL BLOQUE DE VALIDACIÓN ---

try {
    $stmt = $conn->prepare("INSERT INTO waiting_list (customer_name, number_of_people, customer_phone) VALUES (?, ?, ?)");
    $stmt->bind_param("sis", $name, $people, $phone);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'id' => $conn->insert_id]);
    } else {
        throw new Exception("Error al ejecutar la consulta.");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
}

$conn->close();
?>