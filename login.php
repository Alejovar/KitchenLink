<?php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Definiciones de Roles (IDs según tu DB)
define('MESERO_ROLE_ID', 2);
define('COCINA_ROLE_ID', 3);
define('HOSTESS_ROLE_ID', 4);
define('BARRA_ROLE_ID', 5); // 🔑 ROL DE BARRA AÑADIDO

// 1. Bloqueo de caché
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");

// 2. 🔑 LÓGICA CRÍTICA DE REDIRECCIÓN POR ROL
if (isset($_SESSION['user_id']) && isset($_SESSION['rol_id'])) {
    
    $roleId = $_SESSION['rol_id'];
    $destination = '';
    
    // Determina la página de destino basada en el rol
    switch ($roleId) {
        case MESERO_ROLE_ID:
            $destination = '/KitchenLink/src/php/orders.php';
            break;
        case COCINA_ROLE_ID:
            $destination = '/KitchenLink/src/php/kitchen_orders.php';
            break;
        case HOSTESS_ROLE_ID:
            $destination = '/KitchenLink/src/php/reservations.php';
            break;
        case BARRA_ROLE_ID: // 🔑 REDIRECCIÓN A BARRA
            $destination = '/KitchenLink/src/php/bar_orders.php';
            break;
        default:
            // Si el rol es desconocido, cerramos la sesión y dejamos que vea el login
            session_unset();
            session_destroy();
            break;
    }

    // Redirige si se encontró una interfaz válida
    if (!empty($destination)) {
        header('Location: ' . $destination);
        exit();
    }
}
// 3. El resto del código es el HTML del formulario de login
?>
<!--Clase principal de login-->
<!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />
  <link rel="stylesheet" href="src/css/style.css" />
  <title>Login | KitchenLink</title>
</head>

<body>
  <div class="container" id="container">
    <div class="form-container sign-in">
      <form id="loginForm" action="/KitchenLink/src/php/login_handler.php" method="POST">
        <h1>Iniciar Sesión</h1>
        <span>Ingresa tu nombre de usuario y contraseña</span>

        <input type="text" placeholder="Nombre de usuario" name="user" id="user" />
        <input type="password" placeholder="Contraseña" name="password" id="password" />


        <!-- Contenedor de error, muestra los errores al no rellenar bien los campos -->
        <div id="loginError" class="login-error"></div>

        <button type="submit">Iniciar Sesión</button>
      </form>
    </div>
    <div class="toggle-container">
      <div class="toggle">
        <div class="toggle-panel toggle-right">
          <h1>¡Hola, Bienvenido!</h1>
          <img src="src/images/logos/La Mare Mestiza.png" alt="Logo de La Mare Metiza"
            style="max-width: 80%; margin-top: 20px;" />
          <p>¿Eres nuevo? habla al gerente para que te apoye en el proceso de registro.</p>
          <a href="register.html">
            <button class="hidden">Regístrate</button>
          </a>
        </div>
      </div>
    </div>
  </div>

  <script src="/KitchenLink/src/js/script.js"></script>
</body>

</html>