class TableNumberChanger {
    constructor(advancedModalInstance) {
        // La instancia del modal avanzado para cerrarlo tras el éxito
        this.advancedModal = advancedModalInstance; 
        
        this.form = document.getElementById('changeTableNumberForm');
        this.input = document.getElementById('newTableNumberInput');
        this.errorMsg = document.getElementById('tableNumberErrorMsg');
        this.currentTableDisplay = document.getElementById('currentTableDisplay');

        this.currentTableNumber = null;
        
        // Asegúrate de que esta ruta sea correcta para el script de renombrar
        this.apiEndpoint = '/KitchenLink/src/api/orders/advanced_options/change_table.php';
    }

    // Método para inicializar el form y sus listeners
    initialize(currentTableNumber, currentOrderID) { 
        this.input.value = '';
        this.errorMsg.style.display = 'none';

        this.currentTableNumber = parseInt(currentTableNumber, 10);
        
        this.currentTableDisplay.textContent = currentTableNumber;

        if (this.form) {
            this.form.removeEventListener('submit', this._handleSubmitBound);
            this._handleSubmitBound = this._handleSubmit.bind(this);
            this.form.addEventListener('submit', this._handleSubmitBound);
        }
    }

    async _handleSubmit(event) {
        event.preventDefault();
        this.errorMsg.style.display = 'none';

        const newTableNumber = parseInt(this.input.value, 10);
        
        if (isNaN(newTableNumber) || newTableNumber <= 0) {
            this._showError('Por favor, ingrese un número de mesa válido.');
            return;
        }

        if (newTableNumber === this.currentTableNumber) {
            this._showError('La nueva mesa debe ser diferente a la actual.');
            return;
        }

        try {
            // Se envían solo los dos números de mesa
            const res = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    current_table_number: this.currentTableNumber,
                    new_table_number: newTableNumber
                })
            });
            const result = await res.json();

            if (result.success) {
                alert(`${result.message}`);
                this.advancedModal.close();
                
                // 🚀 DISPARA EVENTO DE RECARGA: orders.js lo escuchará
                window.dispatchEvent(new CustomEvent('table-list-update')); 
                
            } else {
                this._showError(result.message || 'Error desconocido al reasignar la mesa.');
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            this._showError('Error de conexión con el servidor.');
        }
    }

    _showError(message) {
        this.errorMsg.textContent = message;
        this.errorMsg.style.display = 'block';
    }
}

// 🚨 EXPORTACIÓN FINAL 🚨
// Exportamos la clase para que ModalAdvancedOptions la pueda importar.
export { TableNumberChanger };