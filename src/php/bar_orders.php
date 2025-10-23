<?php
// bar_orders.php - Interfaz principal para la Barra

require_once $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/security/check_session.php';

// --- LÓGICA DE SEGURIDAD ---
// ✅ CAMBIO: Se ajusta el rol_id para el 'encargado de barra' (asumiendo que es el ID 5 según tu base de datos).
if (!isset($_SESSION['user_id']) || $_SESSION['rol_id'] != 5) { 
    header('Location: /KitchenLink/index.html');
    exit();
}

// ✅ CAMBIO: Variables de personalización para el usuario de barra.
$userName = htmlspecialchars($_SESSION['user_name'] ?? 'Bartender');
$rolName = htmlspecialchars($_SESSION['rol_name'] ?? 'Encargado de Barra'); 
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Órdenes de Barra - KitchenLink</title>

    <link rel="stylesheet" href="/KitchenLink/src/css/bar_styles.css"> 
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>
<body>

<div class="main-container">
    <aside class="sidebar">
        <div>
            <h2>Restaurante</h2>
            <ul>
                <li>
                    <a href="/KitchenLink/src/php/bar_orders.php" class="active">
                        <i class="fas fa-martini-glass-citrus"></i> Órdenes de Barra
                    </a>
                </li>
                <li>
                    <a href="/KitchenLink/src/php/bar_history.php">
                        <i class="fas fa-history"></i> Historial de Barra
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
            <div id="barArea">
                <h2>Barra <i class="fas fa-martini-glass-citrus"></i></h2>
                <div id="barOrdersGrid" class="production-grid">
                    <p class="loading-msg">Cargando órdenes de barra...</p>
                </div>
            </div>
        </div>
    </main>
</div>
<script src="/KitchenLink/src/js/session_interceptor.js"></script>
<script src="/KitchenLink/src/js/bar_logic.js"></script>
</body>
</html>