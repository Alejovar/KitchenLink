<?php
// Logica de la intefaz de login (ACTUALIZADA CON BLOQUEO DE SESIÓN CONCURRENTE)

session_start();
require 'db_connection.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $user = trim($_POST['user'] ?? '');
    $password = trim($_POST['password'] ?? '');

    // Validaciones de campos vacíos (sin cambios)
    if (empty($user) || empty($password)) {
        echo json_encode(["success" => false, "message" => "Faltó ingresar usuario y/o contraseña."]);
        exit;
    }

    // ✅ PASO CLAVE 1: Pedimos también el session_token para revisarlo
    $stmt = $conn->prepare("SELECT id, password, name, rol_id, session_token FROM users WHERE user = ?");
    $stmt->bind_param("s", $user);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $hashed_password = $row['password'];

        if (password_verify($password, $hashed_password)) {
            
            // ✅ PASO CLAVE 2: LA VERIFICACIÓN DEL "HOTEL"
            // Antes de hacer nada, revisamos si la habitación (el token) ya está ocupada.
            if (!empty($row['session_token'])) {
                // Si el token NO está vacío, significa que ya hay una sesión activa.
                // Rechazamos el nuevo inicio de sesión.
                echo json_encode([
                    "success" => false,
                    "message" => "Este usuario ya tiene una sesión activa en otro dispositivo."
                ]);
                exit; // Detenemos el script aquí.
            }

            // Si llegamos aquí, significa que la "habitación" está libre y podemos proceder.
            $session_token = bin2hex(random_bytes(32));

            $update_stmt = $conn->prepare("UPDATE users SET session_token = ? WHERE id = ?");
            $update_stmt->bind_param("si", $session_token, $row['id']);
            $update_stmt->execute();
            $update_stmt->close();

            $_SESSION['loggedin'] = true;
            $_SESSION['user_id'] = $row['id'];
            $_SESSION['user_name'] = $row['name'];
            $_SESSION['rol_id'] = $row['rol_id'];
            $_SESSION['session_token'] = $session_token;
            
            // Lógica de redirección (sin cambios)
            $redirect_url = "/KitchenLink/dashboard.php"; // URL por defecto
            if ($row['rol_id'] == 4) {
                $redirect_url = "/KitchenLink/src/php/reservations.php";
            } elseif ($row['rol_id'] == 2) {
                $redirect_url = "/KitchenLink/src/php/orders.php";
            } elseif ($row['rol_id'] == 3) {
                $redirect_url = "/KitchenLink/src/php/kitchen_orders.php";
            } elseif ($row['rol_id'] == 5) {
                $redirect_url = "/KitchenLink/src/php/bar_orders.php";
            }
            echo json_encode(["success" => true, "redirect" => $redirect_url]);

        } else {
            echo json_encode(["success" => false, "message" => "Contraseña incorrecta."]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Usuario no existente."]);
    }

    $stmt->close();
}
$conn->close();
exit;
