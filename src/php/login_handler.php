<?php
// Logica de la intefaz de login (CORREGIDA: Limpieza de Token Fantasma)

session_start();
require $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/db_connection.php'; // Usamos ruta absoluta

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $user = trim($_POST['user'] ?? '');
    $password = trim($_POST['password'] ?? '');

    // Validaciones de campos vacíos
    if (empty($user) || empty($password)) {
        echo json_encode(["success" => false, "message" => "Faltó ingresar usuario y/o contraseña."]);
        exit;
    }

    // ✅ PASO 1: Obtener toda la información, incluido el session_token
    $stmt = $conn->prepare("SELECT id, password, name, rol_id, session_token FROM users WHERE user = ?");
    $stmt->bind_param("s", $user);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result && $result->num_rows === 1) {
        $row = $result->fetch_assoc();
        $hashed_password = $row['password'];

        if (password_verify($password, $hashed_password)) {
            
            // 🔑 PASO 2: VERIFICACIÓN Y LIMPIEZA DE TOKEN FANTASMA
            
            // Si el token NO está vacío, significa que hay un token fantasma (sesión PHP anterior muerta).
            if (!empty($row['session_token'])) {
                
                // 💥 CORRECCIÓN CRÍTICA: Borrar el token inmediatamente.
                // Asumimos que el usuario actual es legítimo porque pasó el password_verify.
                $stmt_clear = $conn->prepare("UPDATE users SET session_token = NULL WHERE id = ?");
                $stmt_clear->bind_param("i", $row['id']);
                $stmt_clear->execute();
                $stmt_clear->close();
                
                // Nota: No salimos con error. Simplemente limpiamos y continuamos con el login normal.
            }
            // Si el token era NULL, simplemente continuamos.

            // 3. GENERAR NUEVO TOKEN Y ACTUALIZAR DB
            $session_token = bin2hex(random_bytes(32));

            $update_stmt = $conn->prepare("UPDATE users SET session_token = ? WHERE id = ?");
            $update_stmt->bind_param("si", $session_token, $row['id']);
            $update_stmt->execute();
            $update_stmt->close();

            // 4. ESTABLECER VARIABLES DE SESIÓN
            $_SESSION['loggedin'] = true;
            $_SESSION['user_id'] = $row['id'];
            $_SESSION['user_name'] = $row['name'];
            $_SESSION['rol_id'] = $row['rol_id'];
            $_SESSION['session_token'] = $session_token;
            
            // 5. Lógica de redirección por rol
            $redirect_url = "/KitchenLink/dashboard.php"; 
            
            switch ($row['rol_id']) {
                case 4:
                    $redirect_url = "/KitchenLink/src/php/reservations.php";
                    break;
                case 2:
                    $redirect_url = "/KitchenLink/src/php/orders.php";
                    break;
                case 3:
                    $redirect_url = "/KitchenLink/src/php/kitchen_orders.php";
                    break;
                case 5:
                    $redirect_url = "/KitchenLink/src/php/bar_orders.php";
                    break;
                // Nota: Puedes añadir el caso 1 para gerente aquí si lo necesitas.
            }

            echo json_encode(["success" => true, "redirect" => $redirect_url]);

        } else {
            echo json_encode(["success" => false, "message" => "Contraseña incorrecta."]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Usuario no existente."]);
    }

    // El primer $stmt ya se cerró arriba, cerramos solo la conexión aquí.
    $conn->close();
}
exit;