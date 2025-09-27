<?php
session_start();
// Redirige al login si no hay una sesión activa
if (!isset($_SESSION['user_id'])) {
    header("Location: /KitchenLink/login.html");
    exit();
}
$hostess_name = htmlspecialchars($_SESSION['user_name'] ?? 'Hostess');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lista de Espera</title>
    <link rel="stylesheet" href="/KitchenLink/src/css/reservations.css">
    <link rel="stylesheet" href="/KitchenLink/src/css/waiting_list.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
</head>
<body>

    <aside class="sidebar">
        <div>
            <h2>Restaurante</h2>
            <ul>
                <li><a href="/KitchenLink/src/php/reservations.php"><i class="fas fa-calendar-alt"></i> Reservaciones</a></li>
                <li><a href="/KitchenLink/src/php/waiting_list.php" class="active"><i class="fas fa-list-ol"></i> Lista de espera</a></li>
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
        <h1>Lista de Espera</h1>

        <div class="main-view">
            <section class="waitlist-display-container">
                <div class="waitlist-header">
                    <h3>Clientes en espera</h3>
                    <div class="estimated-time">
                        <i class="fas fa-clock"></i>
                        <span>Espera estimada: <strong id="estimatedTime">-- min</strong></span>
                    </div>
                </div>
                <div id="waitingList">
                    </div>
            </section>
            
            <section class="form-section">
                <h3>Agregar a la lista</h3>
                <form id="waitlistForm" method="POST">
                    <div class="form-row">
                        <input 
                            type="text" 
                            name="customer_name" 
                            placeholder="Nombre del cliente" 
                            required 
                            pattern="[a-zA-Z\s]+" 
                            maxlength="100"
                            title="Solo se admiten letras y espacios.">
                        
                        <input 
                            type="text" 
                            name="number_of_people" 
                            placeholder="N° de personas" 
                            required 
                            pattern="[0-9]{1,2}"
                            maxlength="2"
                            title="Solo se admiten 1 o 2 dígitos numéricos.">
                    </div>
                    <input 
                        type="tel" 
                        name="customer_phone" 
                        placeholder="Teléfono (opcional)" 
                        pattern="[0-9]{1,10}"
                        maxlength="10"
                        title="El teléfono debe tener máximo 10 dígitos.">
                        
                    <button type="submit">Agregar</button>
                </form>
            </section>
        </div>
    </main>

    <div id="seatClientModal" class="modal-overlay" style="display: none;">
        <div class="modal-content">
            <button class="modal-close" title="Cerrar">&times;</button>
            <h3>Asignar Mesa</h3>
            <p>Seleccione una o más mesas para <strong id="modalClientName"></strong>:</p>
            
            <div id="modalTableGrid" class="modal-table-grid">
                </div>

            <div class="modal-actions">
                <button id="cancelSeatBtn" class="btn-secondary">Cancelar</button>
                <button id="confirmSeatBtn" class="btn-primary">Confirmar y Sentar</button>
            </div>
        </div>
    </div>

    <script src="/KitchenLink/src/js/waiting_list.js"></script>
</body>
</html>