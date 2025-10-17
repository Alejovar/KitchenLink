// GuestCountChanger.js
export class GuestCountChanger {
    constructor(advancedModalInstance) {
        this.advancedModal = advancedModalInstance; 
        
        this.form = document.getElementById('changeGuestCountForm');
        this.input = document.getElementById('newGuestCountInput');
        this.errorMsg = document.getElementById('guestCountErrorMsg');
        this.currentTableDisplay = document.getElementById('currentGuestTableDisplay');

        this.currentTableNumber = null;
        this.apiEndpoint = '/KitchenLink/src/api/orders/advanced_options/change_guest_count.php';
    }

    initialize(currentTableNumber) {
        this.input.value = '';
        this.errorMsg.style.display = 'none';

        this.currentTableNumber = parseInt(currentTableNumber, 10);
        
        this.currentTableDisplay.textContent = currentTableNumber;

        if (this.form) {
            // Aseguramos que solo haya un listener activo
            this.form.removeEventListener('submit', this._handleSubmitBound);
            this._handleSubmitBound = this._handleSubmit.bind(this);
            this.form.addEventListener('submit', this._handleSubmitBound);
        }
    }

    async _handleSubmit(event) {
        // 🚨 CRÍTICO: Detener el envío del formulario inmediatamente
        event.preventDefault(); 
        
        this.errorMsg.style.display = 'none';

        const newGuestCount = parseInt(this.input.value, 10);

        if (isNaN(newGuestCount) || newGuestCount <= 0) {
            this._showError('Por favor, ingrese un número válido mayor a cero.');
            return;
        }

        try {
            const res = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table_number: this.currentTableNumber,
                    new_guest_count: newGuestCount
                })
            });
            const result = await res.json();

            if (result.success) {
                alert(`${result.message}`);
                this.advancedModal.close();
                
                // Disparar evento para recargar la interfaz
                window.dispatchEvent(new CustomEvent('table-list-update')); 
                
            } else {
                this._showError(result.message || 'Error desconocido al actualizar comensales.');
            }
        } catch (error) {
            // Si hay un error de conexión aquí, el fetch no se completa, y event.preventDefault() 
            // ya detuvo la recarga, por lo que este catch solo muestra el error sin recargar.
            console.error('Error de conexión:', error);
            this._showError('Error de conexión con el servidor.');
        }
    }

    _showError(message) {
        this.errorMsg.textContent = message;
        this.errorMsg.style.display = 'block';
    }
}