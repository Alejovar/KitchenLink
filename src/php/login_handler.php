<?php
//Logica de la intefaz de login
session_start();
require 'db_connection.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $user = trim($_POST['user'] ?? '');
    $password = trim($_POST['password'] ?? '');

    // Validaciones de campos vacíos (sin cambios)
    if (empty($user) && empty($password)) {
        echo json_encode(["success" => false, "message" => "Faltó ingresar usuario y contraseña."]);
        exit;
    }
    if (empty($user)) {
        echo json_encode(["success" => false, "message" => "Faltó ingresar usuario."]);
        exit;
    }
    if (empty($password)) {
        echo json_encode(["success" => false, "message" => "Faltó ingresar contraseña."]);
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
            
            // En caso de que un usuario con el rol de hostess inicie sesion se le redirige a su interfaz principal
            if ($row['rol_id'] == 4) {
                echo json_encode([
                    "success" => true,
                    "redirect" => "/KitchenLink/src/php/reservations.php"
                ]);
            // Si el usuario tiene id 2 (Mesero) lo mandamos a la ruta de órdenes
            } elseif ($row['rol_id'] == 2) {
                echo json_encode([
                    "success" => true,
                    "redirect" => "/KitchenLink/src/php/orders.php"
                ]);
            // REDIRECCIÓN A COCINA (Rol 3)
            } elseif ($row['rol_id'] == 3) {
                echo json_encode([
                    "success" => true,
                    "redirect" => "/KitchenLink/src/php/kitchen_orders.php"
                ]);
            
            // ✅ NUEVA REDIRECCIÓN A BARRA (Rol 5)
            } elseif ($row['rol_id'] == 5) {
                echo json_encode([
                    "success" => true,
                    "redirect" => "/KitchenLink/src/php/bar_orders.php"
                ]);

            // Cualquier otro usuario
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