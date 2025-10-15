<?php
// MenuModel.php - Clase para manejar consultas del menú y modificadores.

class MenuModel {
    private $conn; // Conexión a la base de datos (MySQLi)

    public function __construct($db_connection) {
        $this->conn = $db_connection;
    }

    /**
     * Obtiene los productos disponibles para una categoría específica.
     */
    public function getProductsByCategory($categoryId) {
        $sql = "SELECT product_id, name, price, modifier_group_id 
                FROM products 
                WHERE category_id = ? 
                ORDER BY name ASC";
        
        $stmt = null;
        try {
            if (!$this->conn) { throw new Exception("Conexión no inicializada."); }
            
            $stmt = $this->conn->prepare($sql);
            if ($stmt === false) { throw new Exception("Error al preparar SQL de productos: " . $this->conn->error); }
            
            $stmt->bind_param("i", $categoryId);
            $stmt->execute();
            $result = $stmt->get_result();
            $products = $result->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
            return $products;
        } catch (\Exception $e) {
            error_log("DB Error getting products: " . $e->getMessage());
            return [];
        }
    }

        /**
     * Obtiene los modificadores (guisos/sabores) para un grupo dado.
     * CRÍTICO: Solución en dos pasos para evitar fallos de JOIN.
     */
    public function getModifiersByGroup($groupId) {
        // 1. SELECT para obtener solo las opciones del modificador
        $sql_options = "SELECT modifier_id, modifier_name, modifier_price
                        FROM modifiers
                        WHERE group_id = ? 
                        ORDER BY modifier_price ASC, modifier_name ASC";
        
        // 2. SELECT para obtener solo el nombre del grupo
        $sql_name = "SELECT group_name FROM modifier_groups WHERE group_id = ?";
        
        $output = ['modifiers' => [], 'group_name' => 'Opción Requerida'];
        $stmt_options = null;
        $stmt_name = null;
        
        try {
            // --- A. Obtener Opciones (Lista de Caliente/Frío o Sabores) ---
            $stmt_options = $this->conn->prepare($sql_options);
            if ($stmt_options === false) throw new Exception("Error SQL en opciones: " . $this->conn->error);
            
            $stmt_options->bind_param("i", $groupId);
            $stmt_options->execute();
            $result_options = $stmt_options->get_result();
            $output['modifiers'] = $result_options->fetch_all(MYSQLI_ASSOC);
            $stmt_options->close();

            // --- B. Obtener Nombre del Grupo (Título del modal) ---
            $stmt_name = $this->conn->prepare($sql_name);
            if ($stmt_name === false) throw new Exception("Error SQL en nombre de grupo: " . $this->conn->error);
            
            $stmt_name->bind_param("i", $groupId);
            $stmt_name->execute();
            $result_name = $stmt_name->get_result();
            $group_row = $result_name->fetch_assoc();
            $stmt_name->close();

            if ($group_row) {
                $output['group_name'] = $group_row['group_name'];
            }

            return $output; 

        } catch (\Exception $e) {
            error_log("DB Error getting modifiers: " . $e->getMessage());
            return ['modifiers' => [], 'group_name' => 'Error de Conexión'];
        }
    }
}