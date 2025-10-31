<?php
// reservations.php - Interfaz principal para Hostess
require_once $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/security/check_session.php';

// --- LÓGICA DE SEGURIDAD CRÍTICA ---
define('HOSTESS_ROLE_ID', 4); // ID 4 según tu base de datos

// 🔑 Verificación Crítica: Si el rol de la sesión NO es el requerido (4), se deniega el acceso.
if (!isset($_SESSION['rol_id']) || $_SESSION['rol_id'] != HOSTESS_ROLE_ID) {
    
    // 💥 CORRECCIÓN CRÍTICA: Destrucción Total (PHP + Token de DB)
    
    // 1. Borrar el token de la base de datos
    // Usamos $conn que fue abierta por check_session.php
    if (isset($conn) && isset($_SESSION['user_id'])) {
        try {
            $clean_stmt = $conn->prepare("UPDATE users SET session_token = NULL WHERE id = ?");
            $clean_stmt->bind_param("i", $_SESSION['user_id']);
            $clean_stmt->execute();
            $clean_stmt->close();
        } catch (\Throwable $e) {
            // Manejo de error si falla la limpieza del token (opcional)
        }
    }
    
    // 2. Destruir la sesión PHP
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_unset();
        session_destroy();
    }
    
    header('Location: /KitchenLink/index.php?error=acceso_no_hostess_lista');
    exit();
}
// Si el script llega aquí, el usuario es una Hostess válida.

$hostess_name = htmlspecialchars($_SESSION['user_name'] ?? 'Hostess');
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestión de Mesas y Reservaciones | KitchenLink</title>
      <link rel="icon" href="/KitchenLink/src/images/logos/KitchenLink_logo.png" type="image/png" sizes="32x32">
    <link rel="stylesheet" href="/KitchenLink/src/css/reservations.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
</head>
<body>

    <aside class="sidebar">
        <div>
            <h2>Restaurante</h2>
            <ul>
                <li><a href="/KitchenLink/src/php/reservations.php" class="active"><i class="fas fa-calendar-alt"></i> Reservaciones</a></li>
                
                <li><a href="/KitchenLink/src/php/waiting_list.php"><i class="fas fa-list-ol"></i> Lista de espera</a></li>
            </ul>
        </div>
         <div class="user-info">
            <div class="user-details">
                <i class="fas fa-user-circle user-avatar"></i>
                <strong><?php echo $hostess_name; ?></strong><br>
                <span>Sesión activa</span>
            </div>
            <a href="/KitchenLink/src/php/logout.php" class="logout-btn" title="Cerrar Sesión">
                <i class="fas fa-sign-out-alt"></i>
            </a>
        </div>
    </aside>

    <main class="content">
        <h1>Gestión de Mesas y Reservaciones</h1>
        <section class="form-section">
            <h3>Nueva reservación</h3>
            <form id="reservaForm">
                <div class="form-row">
                    <input type="date" name="reservation_date" required>
                    <input type="time" name="reservation_time" step="900" required>
                    
                    <div class="custom-select-container" id="tableSelectorContainer">
                        <span style="color: #999; font-size: 14px; align-self: center;">Seleccione fecha y hora...</span>
                    </div>
                </div>
                <div class="form-row">
                    <input type="text" name="number_of_people" placeholder="N° de personas" required pattern="[0-9]+">
                    <input type="text" name="customer_name" placeholder="Nombre del cliente" required pattern="[a-zA-Z\s]+">
                    <input type="tel" name="customer_phone" placeholder="Teléfono (opcional)" pattern="[0-9]+">
                </div>
                <textarea name="special_requests" placeholder="Solicitudes especiales (opcional)" maxlength="500"></textarea>
                
                <div id="hiddenTableInputs"></div>
                
                <br><br>
                <button type="submit">Registrar reservación</button>
            </form>
        </section>
        <div class="main-view">
            <section class="table-status-container">
                <h3>Estado Actual de Mesas</h3>
                <div id="tableGrid"></div>
            </section>
            
            <section class="reservations-list-container">
                 <div class="reservations-header">
                    <h3>Reservaciones del día</h3>
                    <input type="date" id="viewDate">
                </div>
                <div id="reservationsList"></div>
            </section>
        </div>
    </main>
    <script src="/KitchenLink/src/js/session_interceptor.js"></script>
    <script src="/KitchenLink/src/js/reservations.js"></script>
</body>
</html>