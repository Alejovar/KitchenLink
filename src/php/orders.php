<?php
// orders.php - Tu archivo principal en el servidor
session_start();

// --- LÓGICA DE SEGURIDAD CRÍTICA ---
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
<title>Gestión de Mesas</title>

<link rel="stylesheet" href="/KitchenLink/src/css/orders.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>
<body>

<div class="main-container">
    <aside class="sidebar">
        <div>
            <h2>Restaurante</h2>
            <ul>
                <li><a href="#" class="active"><i class="fas fa-utensils"></i> Mesas</a></li>
                <li><a href="#"><i class="fas fa-bell"></i> Órdenes Pendientes</a></li>
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
        <h1>Gestión de Mesas</h1>
        
        <section class="table-status-container">
            <h3>Estado de Mis Mesas</h3>
            
            <div class="table-grid" id="tableGridContainer">
                <p id="loadingMessage" style="padding: 20px; color: gray;">Cargando mesas...</p>
            </div>
            
            <button class="fab" id="fab" title="Añadir nueva mesa/orden">
                <i class="fas fa-plus"></i>
            </button>
        </section>
        
        <div class="footer-actions">
            <div class="control-buttons">
                <button class="action-btn secondary-btn" id="btn-edit">Editar</button>
                <button class="action-btn secondary-btn" id="btn-exit">Salir</button>
                <button class="action-btn alert-btn" id="btn-block">Bloquear</button>
                <button class="action-btn primary-btn" id="btn-edit-order">Editar mesa</button>
                <button class="action-btn primary-btn" id="btn-advanced-options">Opciones avanzadas</button>
            </div>
        </div>
    </main>
</div> <?php include 'modal_create_table.php'; ?> 

<script src="/KitchenLink/src/js/orders.js"></script>
</body>
</html>