// ProductsMover.js

export class ProductsMover {
    constructor(advancedModalInstance) {
        this.advancedModal = advancedModalInstance;

        // Elementos del DOM
        this.sourceTableDisplay = document.getElementById('sourceTableDisplay');
        this.sourceProductsList = document.getElementById('sourceProductsList');
        this.selectedCountDisplay = document.getElementById('selectedCount');
        this.destinationTableSelect = document.getElementById('destinationTableSelect');
        this.moveProductsForm = document.getElementById('moveProductsForm');
        this.executeMoveBtn = document.getElementById('executeMoveBtn');
        this.moveErrorMsg = document.getElementById('moveErrorMsg');

        // Estado
        this.sourceTableNumber = null;
        this.sourceOrderID = null; 
        this.selectedItems = new Map();

        // Endpoints de la API
        this.api = {
            GET_DATA: '/KitchenLink/src/api/orders/advanced_options/get_move_data.php',
            EXECUTE_MOVE: '/KitchenLink/src/api/orders/advanced_options/execute_move.php'
        };
        
        // 🔑 ENLACES (BINDS) PARA PODER ELIMINAR LOS LISTENERS
        this._handleSubmitBound = this._handleSubmit.bind(this);
        this._handleProductListClickBound = this._handleProductListClick.bind(this);
        this._checkCanMoveBound = this._checkCanMove.bind(this); // Para el listener de 'change'
    }

    // Inicializa la pestaña al abrirse
    initialize(sourceTableNumber) {
        this._resetState();
        this.sourceTableNumber = parseInt(sourceTableNumber, 10);
        this.sourceTableDisplay.textContent = sourceTableNumber;
        this._setupEventListeners();
        this._loadMoveData();
    }
    
    // 💡 MÉTODO CLAVE: Elimina todos los listeners para evitar duplicados
    dispose() {
        // 1. Elimina el listener del formulario
        this.moveProductsForm.removeEventListener('submit', this._handleSubmitBound);
        
        // 2. Elimina el listener delegado de la lista de productos
        this.sourceProductsList.removeEventListener('click', this._handleProductListClickBound);
        
        // 3. Elimina el listener del selector de mesa destino
        this.destinationTableSelect.removeEventListener('change', this._checkCanMoveBound);
        
        // 4. Limpia el estado para la próxima apertura
        this._resetState();
    }

    // Limpia todas las variables de estado y DOM
    _resetState() {
        this.selectedItems.clear();
        this.sourceOrderID = null;
        this.sourceProductsList.innerHTML = '<p class="loading-msg">Cargando productos...</p>';
        this.destinationTableSelect.innerHTML = '<option value="">Cargando mesas...</option>';
        this.selectedCountDisplay.textContent = '0';
        this.executeMoveBtn.disabled = true;
        this.moveErrorMsg.style.display = 'none';
        this.moveErrorMsg.textContent = '';
    }

    // Configura listeners (añade los listeners)
    _setupEventListeners() {
        // Formulario
        this.moveProductsForm.addEventListener('submit', this._handleSubmitBound);

        // Listener delegado de la lista de productos
        this.sourceProductsList.addEventListener('click', this._handleProductListClickBound);

        // Listener para verificar si se puede habilitar el botón de mover
        this.destinationTableSelect.addEventListener('change', this._checkCanMoveBound);
    }
    
    // 💡 NUEVO: Manejador de clics delegado
    _handleProductListClick(e) {
        const itemElement = e.target.closest('.product-item');
        if (itemElement) {
            this._handleItemSelection(itemElement);
        }
    }


    // Carga inicial de productos y mesas destino
    async _loadMoveData() {
        try {
            const url = `${this.api.GET_DATA}?source_table=${this.sourceTableNumber}`;
            const res = await fetch(url);
            const data = await res.json();

            if (!data.success) {
                this.sourceProductsList.innerHTML = `<p class="error-msg">${data.message || 'Error al obtener datos.'}</p>`;
                return;
            }

            // 1. Guardar Order ID de Origen
            this.sourceOrderID = data.source_order_id;

            // 2. Renderizar Productos
            this._renderProducts(data.products);

            // 3. Renderizar Mesas Destino
            this._renderDestinationTables(data.available_tables);

        } catch (error) {
            this.sourceProductsList.innerHTML = `<p class="error-msg">Error de conexión al servidor.</p>`;
        }
    }

    // Maneja la selección de productos con alternancia visual
    _handleItemSelection(itemElement) {
        const detailId = itemElement.dataset.detailId;
        const quantity = parseInt(itemElement.dataset.quantity, 10);
        
        // Alternar la clase 'selected'
        const isSelected = itemElement.classList.toggle('selected');
        
        if (isSelected) {
            // Seleccionar: Añadir al mapa
            this.selectedItems.set(detailId, quantity);
            itemElement.dataset.selected = quantity;
        } else {
            // Deseleccionar: Eliminar del mapa
            this.selectedItems.delete(detailId);
            itemElement.dataset.selected = 0;
        }

        this._updateTotalSelection();
        this._checkCanMove();
    }

    // Actualiza el contador de ítems seleccionados
    _updateTotalSelection() {
        let totalItems = 0;
        this.selectedItems.forEach(qty => {
            totalItems += qty; 
        });
        this.selectedCountDisplay.textContent = totalItems; // Muestra la suma de cantidades
    }

    // Habilita/Deshabilita el botón de Mover
    _checkCanMove() {
        const hasSelection = this.selectedItems.size > 0;
        const hasDestination = this.destinationTableSelect.value !== '';
        this.executeMoveBtn.disabled = !(hasSelection && hasDestination);
    }

    // Renderiza la lista de productos con formato estético
    _renderProducts(products) {
        this.sourceProductsList.innerHTML = '';
        if (products.length === 0) {
            this.sourceProductsList.innerHTML = '<p>No hay productos pendientes para mover.</p>';
            return;
        }

        const listHtml = products.map(p => {
            return `
                <div class="product-item" 
                     data-detail-id="${p.detail_id}" 
                     data-quantity="${p.quantity}" 
                     data-selected="0" 
                     title="Clic para mover ${p.product_name}">
                    <span class="item-qty">${p.quantity}x</span>
                    <span class="item-name">${p.product_name}</span>
                    <span class="item-price">$${p.price_at_order.toFixed(2)}</span>
                    <i class="selection-icon fas fa-check-circle"></i>
                </div>
            `;
        }).join('');

        this.sourceProductsList.innerHTML = listHtml;
    }

    // Renderiza el selector de mesas destino
    _renderDestinationTables(tables) {
        this.destinationTableSelect.innerHTML = '<option value="">-- Seleccione Mesa --</option>';

        tables.forEach(t => {
            // Solo muestra mesas que no sean la de origen (aunque la API ya lo filtra)
            if (t.table_number !== this.sourceTableNumber) {
                const option = document.createElement('option');
                option.value = t.table_number; 
                option.textContent = `Mesa ${t.table_number} (${t.status})`;
                this.destinationTableSelect.appendChild(option);
            }
        });
    }

    // Maneja el envío final del movimiento
    async _handleSubmit(event) {
        event.preventDefault();
        this.moveErrorMsg.style.display = 'none';

        const destinationTableNumber = parseInt(this.destinationTableSelect.value, 10);
        
        if (!this.sourceOrderID || this.selectedItems.size === 0 || !destinationTableNumber) {
            this._showError('Faltan datos de origen o destino.');
            return;
        }
        
        // Crear el array de ítems a mover a partir del mapa (solo necesitamos ID y cantidad)
        const itemsToMove = Array.from(this.selectedItems.entries()).map(([detailId, quantity]) => ({
            detail_id: parseInt(detailId, 10),
            quantity: quantity 
        }));

        this.executeMoveBtn.disabled = true;
        this.executeMoveBtn.textContent = 'Moviendo...';

        try {
            const res = await fetch(this.api.EXECUTE_MOVE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_order_id: this.sourceOrderID,
                    destination_table_number: destinationTableNumber,
                    items: itemsToMove
                })
            });
            const result = await res.json();
            
            if (result.success) {
                alert(result.message);
                this.advancedModal.close();
                // Recargar la interfaz de mesas para ver el cambio de estado/producto
                window.dispatchEvent(new CustomEvent('table-list-update')); 
            } else {
                this._showError(result.message || 'Error desconocido al mover productos.');
            }

        } catch (error) {
            this._showError('Error de conexión con el servidor.');
        } finally {
            this.executeMoveBtn.disabled = false;
            this.executeMoveBtn.textContent = 'Mover Seleccionados';
        }
    }

    _showError(message) {
        this.moveErrorMsg.textContent = message;
        this.moveErrorMsg.style.display = 'block';
    }
}