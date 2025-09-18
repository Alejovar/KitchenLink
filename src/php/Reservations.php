<?php
// Inicia o reanuda la sesión del navegador.
session_start(); 

// PREGUNTA: ¿Existe un 'user_id' guardado en la sesión?
// Si no existe, significa que nadie ha iniciado sesión.
if (!isset($_SESSION['user_id'])) {
    // RESPUESTA "NO": Redirige inmediatamente al login.
    header("Location: /KitchenLink/login.html");
    // Detiene por completo la carga del resto de la página.
    exit(); 
}

// Si el código llega hasta aquí, significa que SÍ hay una sesión activa.
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
                <li><a href="#" class="active">Reservaciones</a></li>
                <li><a href="#">Lista de espera</a></li>
            </ul>
        </div>
        <div class="user-info">
            <strong><?php echo $hostess_name; ?></strong><br>
            Sesión activa
            
            <br>
            <a href="/KitchenLink/src/php/logout.php" class="logout-btn">Cerrar Sesión</a>
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
                <textarea name="special_requests" placeholder="Solicitudes especiales (opcional)"></textarea>
                
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

    <script src="/KitchenLink/src/js/reservations.js"></script>
</body>
</html>