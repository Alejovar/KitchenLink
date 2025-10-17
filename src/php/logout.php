<?php
// Clase de PRUEBA, para cerrar sesion
// Iniciar la sesión para poder acceder a ella.
session_start();

// Eliminar todas las variables de sesión.
$_SESSION = array();

// Destruir la sesión por completo.
session_destroy();

// Redirigir al usuario a la página de inicio de sesión.
header("Location: /KitchenLink/index.html"); // Asegúrate de que esta ruta sea correcta
exit();
?>