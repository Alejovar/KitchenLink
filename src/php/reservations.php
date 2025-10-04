<?php
session_start(); 
// Redirige al login si no hay una sesión activa
if (!isset($_SESSION['user_id'])) {
    header("Location: /KitchenLink/login.html");
    exit(); 
}
// Menu principal de la hostess, en este se pueden realizar reservaciones, cancelarlas y aceptarlas, en cualquier 
// caso se elimina de la tabla principal y se mandan a la tabla de historial para futuros reportes
// Tambien permite la asignacion de mesas a clientes que vayan llegando sin reservacion, 
$hostess_name = htmlspecialchars($_SESSION['user_name'] ?? 'Hostess');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestión de Mesas y Reservaciones</title>
    
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
        <!--Formulario principal de reservaciones--->
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
                <!--Validaciones para evitar que el usuario ingrese datos no deseados-->
                <div class="form-row">
                    <input type="text" name="number_of_people" placeholder="N° de personas" required pattern="[0-9]+">
                    <input type="text" name="customer_name" placeholder="Nombre del cliente" required pattern="[a-zA-Z\s]+">
                    <input type="tel" name="customer_phone" placeholder="Teléfono (opcional)" pattern="[0-9]+">
                </div>
                <!-- AHORA CON LIMITE DE 500 -->
                <textarea name="special_requests" placeholder="Solicitudes especiales (opcional)" maxlength="500"></textarea>
                
                <div id="hiddenTableInputs"></div>
                
                <br><br>
                <button type="submit">Registrar reservación</button>
            </form>
        </section>
        <!--muestra las mesas disponibles-->
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

    <script src="/KitchenLink/src/js/reservations.js"></script>
</body>
</html>
