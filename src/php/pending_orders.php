<?php
// pending_orders.php - CORREGIDO

session_start();

// --- LÓGICA DE SEGURIDAD ---
if (!isset($_SESSION['user_id'])) {
    header('Location: /KitchenLink/login.html');
    exit();
}

// Variables de Personalización
$userName = htmlspecialchars($_SESSION['user_name'] ?? 'Mesero');
?>

<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Órdenes Pendientes - KitchenLink</title>

<link rel="stylesheet" href="/KitchenLink/src/css/pending_orders.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>
<body>

<div class="main-container">
    <aside class="sidebar">
        <div>
            <h2>Restaurante</h2>
            <ul>
                <li>
                    <a href="/KitchenLink/src/php/orders.php">
                        <i class="fas fa-utensils"></i> Mesas
                    </a>
                </li>
                <li>
                    <a href="#" class="active">
                        <i class="fas fa-bell"></i> Órdenes Pendientes
                    </a>
                </li>
            </ul>
        </div>
        
        <div class="user-info">
            <div class="user-details">
                <i class="fas fa-user-circle user-avatar"></i>
                
                <div class="user-text-container">
                    <div class="user-name-text"><?php echo $userName; ?></div>
                    <div class="session-status-text">Sesión activa</div>
                </div>
            </div>
            
            <a href="/KitchenLink/src/php/logout.php" class="logout-btn" title="Cerrar Sesión">
                <i class="fas fa-sign-out-alt"></i>
            </a>
        </div>
    </aside>

    <main class="content">
        <div id="liveClockContainer"></div>

        <h1>Órdenes Pendientes</h1>

        <div id="ordersGrid" class="orders-grid">
            <p class="no-orders">Cargando órdenes pendientes...</p>
        </div>
    </main>
</div>

<div id="orderDetailsPanel" class="details-panel">
    <div class="details-content">
        <div class="details-header">
            <h2>Detalles de la Orden</h2>
            <button id="closeDetailsPanel" class="close-btn">&times;</button>
        </div>
        
        <div class="order-info">
            <p><strong>Mesa:</strong> <span id="detailTableNumber">--</span></p>
            <p><strong>ID Orden:</strong> <span id="detailOrderId">--</span></p>
            <p><strong>Hora de entrada:</strong> <span id="detailBatchTime">--</span></p>
        </div>

        <div id="detailItemsList" class="items-list-container">
            </div>

        <div id="detailPanelFooter" class="details-footer">
            </div>
        
    </div>
</div>


<script src="/KitchenLink/src/js/pending_orders.js"></script>
</body>
</html>