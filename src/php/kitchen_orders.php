<?php
// kitchen_orders.php - Interfaz principal para la Cocina (Área Única)

require_once $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/security/check_session.php';

// --- LÓGICA DE SEGURIDAD ---
// Asumo rol_id 3 (Jefe de Cocina) es el usuario principal de esta interfaz.
if (!isset($_SESSION['user_id']) || $_SESSION['rol_id'] != 3) {
    header('Location: /KitchenLink/index.html');
    exit();
}

// Variables de Personalización
$userName = htmlspecialchars($_SESSION['user_name'] ?? 'Jefe Cocina');
$rolName = htmlspecialchars($_SESSION['rol_name'] ?? 'Jefe de Cocina'); 
?>

<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Órdenes de Cocina - KitchenLink</title>

<link rel="stylesheet" href="/KitchenLink/src/css/kitchen_styles.css"> 
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>
<body>

<div class="main-container">
    <aside class="sidebar">
        <div>
            <h2>Restaurante</h2>
            <ul>
                <li>
                    <a href="/KitchenLink/src/php/kitchen_orders.php" class="active">
                        <i class="fas fa-list-alt"></i> Órdenes de Cocina
                    </a>
                </li>
                <li>
                    <a href="/KitchenLink/src/php/kitchen_history.php">
                        <i class="fas fa-history"></i> Historial de Cocina
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

        <h1>Órdenes de Producción</h1>

        <div class="production-areas">
            <div id="kitchenArea">
                <h2>Cocina <i class="fas fa-utensils"></i></h2>
                <div id="kitchenOrdersGrid" class="production-grid">
                    <p class="loading-msg">Cargando órdenes de cocina...</p>
                </div>
            </div>
        </div>
    </main>
</div>
<script src="/KitchenLink/src/js/session_interceptor.js"></script>
<script src="/KitchenLink/src/js/kitchen_logic.js"></script>
</body>
</html>