<?php
session_start();
require 'db_connection.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $user = trim($_POST['user'] ?? '');
    $password = trim($_POST['password'] ?? '');

    // Validaciones de campos vacíos
    if (empty($user) && empty($password)) {
        echo json_encode([
            "success" => false,
            "message" => "Faltó ingresar usuario y contraseña."
        ]);
        exit;
    }
    if (empty($user)) {
        echo json_encode([
            "success" => false,
            "message" => "Faltó ingresar usuario."
        ]);
        exit;
    }
    if (empty($password)) {
        echo json_encode([
            "success" => false,
            "message" => "Faltó ingresar contraseña."
        ]);
        exit;
    }

    // Consulta en BD
    $stmt = $conn->prepare("SELECT id, password, name, rol_id FROM users WHERE user = ?");
    $stmt->bind_param("s", $user);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $hashed_password = $row['password'];

        if (password_verify($password, $hashed_password)) {
            $_SESSION['loggedin'] = true;
            $_SESSION['user_id'] = $row['id'];
            $_SESSION['user_name'] = $row['name'];
            $_SESSION['rol_id'] = $row['rol_id'];

            if ($row['rol_id'] == 4) {
                echo json_encode([
                    "success" => true,
                    "redirect" => "/KitchenLink/src/php/reservations.php"
                ]);
            } else {
                echo json_encode([
                    "success" => true,
                    "redirect" => "/KitchenLink/dashboard.php"
                ]);
            }
        } else {
            echo json_encode([
                "success" => false,
                "message" => "Contraseña incorrecta."
            ]);
        }
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Usuario no existente."
        ]);
    }

    $stmt->close();
}
$conn->close();
exit;
