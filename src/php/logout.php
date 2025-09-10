<?php
session_start();

// Destruye todas las variables de sesión
session_destroy();

// Redirige al usuario a la página de login
header("Location: ../index.html");
exit;
?>