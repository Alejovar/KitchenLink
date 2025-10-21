<?php
// kitchen_history.php - Interfaz para el Historial de Producción de Cocina

session_start();

// --- LÓGICA DE SEGURIDAD ---
// Mantenemos la misma seguridad, ya que es para el mismo rol.
if (!isset($_SESSION['user_id']) || $_SESSION['rol_id'] != 3) {
    header('Location: /KitchenLink/login.html');
    exit();
}

$userName = htmlspecialchars($_SESSION['user_name'] ?? 'Jefe Cocina');
$rolName = htmlspecialchars($_SESSION['rol_name'] ?? 'Jefe de Cocina'); 
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Historial de Cocina - KitchenLink</title>

    <link rel="stylesheet" href="/KitchenLink/src/css/kitchen_history.css"> 
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>
<body>

<div class="main-container">
    <aside class="sidebar">
        <div>
            <h2>Restaurante</h2>
            <ul>
                <li>
                    <a href="/KitchenLink/src/php/kitchen_orders.php">
                        <i class="fas fa-list-alt"></i> Órdenes de Producción
                    </a>
                </li>
                <li>
                    <a href="/KitchenLink/src/php/kitchen_history.php" class="active">
                        <i class="fas fa-history"></i> Historial
                    </a>
                </li>
            </ul>
        </div>
        
        <div class="user-info">
            <div class="user-details">
                <i class="fas fa-user-circle user-avatar"></i>
                
                <div class="user-text-container">
                    <div class="user-name-text"><?php echo $userName; ?></div>
                    <div class="session-status-text">Sesión activa </div>
                </div>
            </div>
            
            <a href="/KitchenLink/src/php/logout.php" class="logout-btn" title="Cerrar Sesión">
                 <i class="fas fa-sign-out-alt"></i> </a>
        </div>
    </aside>

    <main class="content">
        <div id="liveClockContainer"></div>

        <div class="history-header">
            <h1>Historial de Producción</h1>
            <div class="date-selector">
                <label for="historyDate">Seleccionar fecha:</label>
                <input type="date" id="historyDate">
            </div>
        </div>

        <div id="kitchenHistoryGrid" class="production-grid">
            <p class="loading-msg">Cargando historial...</p>
        </div>
    </main>
</div>

<script src="/KitchenLink/src/js/history_kitchen.js"></script>

</body>
</html>