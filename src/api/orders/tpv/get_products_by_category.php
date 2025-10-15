<?php
// get_products_by_category.php - API para TPV

session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['rol_id'] != 2) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado.']);
    exit();
}

$category_id = filter_input(INPUT_GET, 'category_id', FILTER_VALIDATE_INT);

if (!$category_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de categoría inválido.']);
    exit();
}

// CRÍTICO: Las rutas de require deben ser estables
require '../../../php/db_connection.php'; 
require 'MenuModel.php';      

try {
    $menuModel = new MenuModel($conn);
    $products = $menuModel->getProductsByCategory($category_id);

    // Si la consulta es exitosa, devolvemos success: true
    echo json_encode(['success' => true, 'products' => $products]);

} catch (\Exception $e) {
    error_log("DB Error fetching products: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al consultar productos: ' . $e->getMessage()]);
}
?>