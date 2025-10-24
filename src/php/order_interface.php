<?php
// order_interface.php - VERSIÓN FINAL Y ROBUSTA

// Quitar la visualización de errores solo si la quieres ver en el HTML,
// pero es mejor mantenerlos en 0 para producción y usar logs.
// ini_set('display_errors', 1); 
// error_reporting(E_ALL);     

// 1. Seguridad (Verifica login/token y obtiene $_SESSION['rol_id'])
require_once $_SERVER['DOCUMENT_ROOT'] . '/KitchenLink/src/php/security/check_session.php';

// 2. Definición del rol
define('MESERO_ROLE_ID', 2);

// 🔑 VERIFICACIÓN DE ROL: Si no es mesero, redirige.
if ($_SESSION['rol_id'] != MESERO_ROLE_ID) {
    
    // 💥 CORRECCIÓN CRÍTICA: Destruir la sesión para forzar el logout
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_unset();
        session_destroy();
    }
    
    header('Location: /KitchenLink/index.php?error=acceso_no_mesero');
    exit();
}
// ⚠️ Se eliminó la verificación redundante de !isset($_SESSION['user_id'])


// 3. Obtener y validar la mesa
$table_number = filter_input(INPUT_GET, 'table', FILTER_VALIDATE_INT);
if (!$table_number) {
    header('Location: /KitchenLink/src/php/orders.php');
    exit();
}

// 4. Conexión a DB (Ya está abierta por check_session.php, solo verificamos)
if (!isset($conn) || $conn->connect_error) {
    die("Error fatal de conexión a la base de datos."); // Detenemos la ejecución si la conexión falló
}

// 5. Consulta de Categorías
$categories = [];
try {
    $sql_categories = "SELECT category_id, category_name FROM menu_categories ORDER BY display_order ASC";
    $stmt = $conn->prepare($sql_categories);
    $stmt->execute();
    $categories_result = $stmt->get_result();
    $categories = $categories_result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
} catch (\Exception $e) {
    error_log("DB Error fetching categories: " . $e->getMessage());
}

// 6. Consulta de items
$existing_items = [];
try {
    $sql_all_items = "
        SELECT
            od.added_at, p.name AS product_name, m.modifier_name,
            od.product_id AS id, od.price_at_order AS price,
            od.special_notes AS comment, od.modifier_id
        FROM orders o
        JOIN restaurant_tables rt ON o.table_id = rt.table_id
        JOIN order_details od ON o.order_id = od.order_id
        JOIN products p ON od.product_id = p.product_id
        LEFT JOIN modifiers m ON od.modifier_id = m.modifier_id
        WHERE rt.table_number = ? AND o.status != 'PAGADA'
        ORDER BY od.added_at ASC, od.detail_id ASC";

    $stmt_items = $conn->prepare($sql_all_items);
    if ($stmt_items === false) {
        throw new \Exception("Error al preparar la consulta de ítems: " . $conn->error);
    }
    
    $stmt_items->bind_param("i", $table_number);
    $stmt_items->execute();
    $items_result = $stmt_items->get_result();

    while ($row = $items_result->fetch_assoc()) {
        $item_name = htmlspecialchars($row['product_name']);
        if (!empty($row['modifier_name'])) {
            $item_name .= " (" . htmlspecialchars($row['modifier_name']) . ")";
        }
        $existing_items[] = [
            'id' => (int)$row['id'],
            'name' => $item_name,
            'price' => (float)$row['price'],
            'comment' => $row['comment'],
            'modifier_id' => $row['modifier_id'] ? (int)$row['modifier_id'] : null,
            'type' => 'product',
            'sentTimestamp' => (new DateTime($row['added_at']))->format(DateTime::ATOM)
        ];
    }
    $stmt_items->close();
} catch (\Exception $e) {
    die("Error fatal al consultar los detalles de la orden: " . $e->getMessage());
}

// 7. Preparar JSON de datos iniciales
$initial_data = [
    'server_time' => (new DateTime())->format(DateTime::ATOM),
    'items' => $existing_items
];
$initial_order_json = json_encode($initial_data);
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ordenando Mesa #<?php echo htmlspecialchars($table_number); ?></title>
    <link rel="stylesheet" href="/KitchenLink/src/css/tpv.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>
<body>
    <div class="tpv-container">
        <header class="tpv-header">
            <h2>Mesa Actual: #<?php echo htmlspecialchars($table_number); ?></h2>
            <div id="liveClockContainer"></div>
            <button onclick="window.location.href='/KitchenLink/src/php/orders.php'" class="btn-back">
                <i class="fas fa-arrow-left"></i> Volver a Mesas
            </button>
        </header>

        <div class="tpv-layout">
            <aside class="category-sidebar">
                <h3>Menú</h3>
                <nav id="categoryList">
                    <?php if (!empty($categories)): ?>
                        <?php $first = true; foreach ($categories as $cat): ?>
                            <a href="#" class="category-item <?php echo $first ? 'active' : ''; ?>" data-category-id="<?php echo $cat['category_id']; ?>">
                                <?php echo htmlspecialchars($cat['category_name']); ?>
                            </a>
                        <?php $first = false; endforeach; ?>
                    <?php else: ?>
                        <p>No hay categorías.</p>
                    <?php endif; ?>
                </nav>
            </aside>

            <section class="product-grid-area">
                <div class="search-product-area">
                    <div class="search-input-wrapper">
                        <i class="fas fa-search search-icon"></i>
                        <input type="text" id="productSearchInput" placeholder="Buscar producto por nombre..." autocomplete="off">
                    </div>
                    
                    <div id="searchResultsDropdown" class="search-results-dropdown" style="display:none;">
                        </div>
                </div>
                
                <h2>Productos</h2> 
                <div id="productGrid"><p id="productLoading">Seleccione una categoría.</p></div>
            </section>
            
            <aside class="order-summary-area">
                <h3>Resumen de Orden</h3>
                <div id="orderItems"><p class="text-center">Aún no hay productos.</p></div>
                <div class="order-total">
                    <span>Total:</span>
                    <span id="orderTotal">$0.00</span>
                </div>
                <div class="order-controls">
                    <div class="quantity-control">
                        <label for="quantitySelector">Cantidad:</label>
                        <input type="number" id="quantitySelector" value="1" min="1" max="20">
                    </div>
                    <button id="addTimeBtn" class="btn btn-secondary"><i class="fas fa-clock"></i> Añadir Tiempo</button>
                </div>
                <div class="order-actions">
                    <button class="btn btn-primary" id="sendOrderBtn">Enviar a Cocina</button>
                </div>
            </aside>
        </div>
    </div>
    
    <div id="modifierModal" class="modal-overlay" style="display:none;">
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h3 id="modalProductName"></h3>
            <p>Seleccione <span id="modifierGroupName">la opción</span> requerida:</p>
            <div id="modifierOptions" class="modifier-options-grid"></div>
            <button id="addModifiedItemBtn" class="btn btn-primary">Añadir al Pedido</button>
        </div>
    </div>

    <div id="commentModal" class="modal-overlay" style="display:none;">
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h3>Añadir Comentario</h3>
            <p id="commentModalItemName"></p>
            <textarea id="commentInput" placeholder="Ej: Sin cebolla, término medio..." rows="4"></textarea>
            <input type="hidden" id="commentItemIndex">
            <div class="modal-actions">
                <button id="cancelCommentBtn" class="btn btn-secondary">Cancelar</button>
                <button id="saveCommentBtn" class="btn btn-primary">Guardar</button>
            </div>
        </div>
    </div>
    
    <script id="initialOrderData" type="application/json"><?php echo $initial_order_json; ?></script>
    <script src="/KitchenLink/src/js/session_interceptor.js"></script>
    <script src="/KitchenLink/src/js/tpv.js"></script> 
</body>
</html>