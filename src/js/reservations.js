document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SELECCIÓN DE ELEMENTOS DEL DOM ---
    const reservaForm = document.getElementById('reservaForm');
    const dateInput = reservaForm.querySelector('input[name="reservation_date"]');
    const timeInput = reservaForm.querySelector('input[name="reservation_time"]');
    const numPersonasInput = reservaForm.querySelector('input[name="number_of_people"]');
    const nombreClienteInput = reservaForm.querySelector('input[name="customer_name"]');
    const telClienteInput = reservaForm.querySelector('input[name="customer_phone"]');
    const tableSelectorContainer = document.getElementById('tableSelectorContainer');
    const hiddenTableInputsContainer = document.getElementById('hiddenTableInputs');
    const tableGrid = document.getElementById('tableGrid');
    const viewDateInput = document.getElementById('viewDate');
    const reservationsList = document.getElementById('reservationsList');

    // --- 2. FUNCIONES DE VALIDACIÓN Y ASÍNCRONAS ---

    /**
     * Valida la lógica de la reservación antes de enviarla.
     * @returns {boolean} - Devuelve true si la validación es exitosa, de lo contrario false.
     */
    function validateReservationLogic() {
        const selectedDate = dateInput.value;
        const selectedTime = timeInput.value;
        
        // Combinamos fecha y hora para una comparación precisa
        const reservationDateTime = new Date(`${selectedDate}T${selectedTime}`);
        const now = new Date();

        // Evita que la fecha/hora sea anterior al momento actual con un margen de 1 minuto
        if (reservationDateTime < (now - 60000)) {
            alert('Error: No se puede reservar en una fecha u hora que ya ha pasado.');
            return false;
        }

        // Valida que la hora esté en el rango permitido (8 AM a 10 PM)
        const hour = parseInt(selectedTime.split(':')[0]);
        if (hour < 8 || hour > 22) { // > 22 para permitir hasta las 22:59
            alert('Error: Las reservaciones solo están disponibles de 8:00 AM a 10:00 PM.');
            return false;
        }

        return true; // Si todas las validaciones son correctas
    }

    async function loadTableStatuses() {
        try {
            const response = await fetch('/KitchenLink/src/api/get_table_status.php');
            const tables = await response.json();
            tableGrid.innerHTML = '';
            tables.forEach(table => {
                const tableBox = document.createElement('div');
                tableBox.className = `table-box ${table.status}`;
                tableBox.dataset.tableId = table.id;
                tableBox.innerHTML = `
                    <div class="table-name">${table.table_name}</div>
                    <span class="table-status-text">${table.status}</span>
                `;
                tableGrid.appendChild(tableBox);
            });
        } catch (error) {
            console.error("Error al cargar estado de mesas:", error);
            tableGrid.innerHTML = '<p style="color: red;">Error al cargar las mesas.</p>';
        }
    }

    async function fetchAvailableTablesForForm() {
        const date = dateInput.value;
        const time = timeInput.value;
        tableSelectorContainer.innerHTML = '<span style="color: #999; font-size: 14px; align-self: center;">Seleccione fecha y hora...</span>';
        hiddenTableInputsContainer.innerHTML = '';
        if (!date || !time) return;

        try {
            const response = await fetch(`/KitchenLink/src/api/get_available_tables.php?date=${date}&time=${time}`);
            const tables = await response.json();
            tableSelectorContainer.innerHTML = '';
            if (tables.length > 0) {
                tables.forEach(table => {
                    const optionDiv = document.createElement('div');
                    optionDiv.className = 'table-option';
                    optionDiv.textContent = table.table_name;
                    optionDiv.dataset.tableId = table.id;
                    tableSelectorContainer.appendChild(optionDiv);
                });
            } else {
                tableSelectorContainer.innerHTML = '<span style="color: #999;">No hay mesas disponibles.</span>';
            }
        } catch (error) {
            console.error("Error al buscar mesas para el formulario:", error);
            tableSelectorContainer.innerHTML = '<p style="color: red;">Error al cargar mesas.</p>';
        }
    }

    async function loadReservations(date) {
        if (!date) return;
        try {
            reservationsList.innerHTML = '<p>Cargando...</p>';
            const response = await fetch(`/KitchenLink/src/api/get_reservations.php?date=${date}`);
            const reservations = await response.json();
            reservationsList.innerHTML = '';
            if (reservations.length > 0) {
                reservations.forEach(res => {
                    const card = document.createElement('div');
                    card.className = 'reservation-card';
                    card.dataset.reservationId = res.id;
                    card.innerHTML = `
                        <div class="reservation-summary">
                            <div class="summary-info">
                                <div class="customer-name">${res.customer_name}</div>
                                <div class="details">${res.reservation_time.substring(0, 5)}h | ${res.number_of_people}p | ${res.table_names}</div>
                            </div>
                            <div class="reservation-actions">
                                <button class="btn-confirm" title="Confirmar llegada"><i class="fas fa-check"></i></button>
                                <button class="btn-cancel" title="Cancelar reservación"><i class="fas fa-times"></i></button>
                            </div>
                            <button class="details-toggle" title="Ver detalles"><i class="fas fa-chevron-down"></i></button>
                        </div>
                        <div class="reservation-details">
                            <p><strong>Teléfono:</strong> ${res.customer_phone || 'No especificado'}</p>
                            <p><strong>Solicitudes:</strong> ${res.special_requests || 'Ninguna'}</p>
                            <p><strong>Registrado por:</strong> ${res.hostess_name}</p>
                        </div>
                    `;
                    reservationsList.appendChild(card);
                });
            } else {
                reservationsList.innerHTML = '<p>No hay reservaciones para esta fecha.</p>';
            }
        } catch (error) {
            console.error("Error al cargar reservaciones:", error);
            reservationsList.innerHTML = '<p style="color: red;">Error al cargar las reservaciones.</p>';
        }
    }
    
    async function archiveReservationAPI(reservationId, status) {
        try {
            const response = await fetch('/KitchenLink/src/api/archive_reservation.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ reservation_id: reservationId, status: status })
            });
            const result = await response.json();
            if (result.success) {
                alert(`Reservación movida al historial como: ${status}`);
                return true;
            } else {
                alert('Error desde el servidor: ' + result.message);
                return false;
            }
        } catch (error) {
            console.error('Error de conexión al archivar:', error);
            alert('Error de conexión. No se pudo completar la acción.');
            return false;
        }
    }

    // --- 3. EVENT LISTENERS ---
    const allowOnlyNumbers = (e) => { e.target.value = e.target.value.replace(/[^0-9]/g, ''); };
    numPersonasInput.addEventListener('input', allowOnlyNumbers);
    telClienteInput.addEventListener('input', allowOnlyNumbers);
    nombreClienteInput.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, ''); });
    
    // **NUEVO: Límites de longitud en tiempo real**
    telClienteInput.addEventListener('input', (e) => {
        if (e.target.value.length > 10) e.target.value = e.target.value.slice(0, 10);
    });
    numPersonasInput.addEventListener('input', (e) => {
        if (e.target.value.length > 2) e.target.value = e.target.value.slice(0, 2);
    });

    dateInput.addEventListener('change', fetchAvailableTablesForForm);
    timeInput.addEventListener('change', fetchAvailableTablesForForm);

    tableSelectorContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('table-option')) {
            const tableButton = e.target;
            const tableId = tableButton.dataset.tableId;
            tableButton.classList.toggle('selected');
            if (tableButton.classList.contains('selected')) {
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'table_ids[]';
                hiddenInput.value = tableId;
                hiddenInput.id = `table-input-${tableId}`;
                hiddenTableInputsContainer.appendChild(hiddenInput);
            } else {
                const inputToRemove = document.getElementById(`table-input-${tableId}`);
                if (inputToRemove) inputToRemove.remove();
            }
        }
    });

    reservaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // **NUEVO: Se llama a la función de validación antes de enviar**
        if (!validateReservationLogic()) {
            return; // Detiene el envío si la validación falla
        }

        const formData = new FormData(reservaForm);
        if (!formData.has('table_ids[]')) {
            alert('Por favor, seleccione al menos una mesa.');
            return;
        }
        try {
            const response = await fetch('/KitchenLink/src/api/add_reservation.php', { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                alert('¡Reservación registrada con éxito!');
                reservaForm.reset();
                hiddenTableInputsContainer.innerHTML = '';
                fetchAvailableTablesForForm();
                loadReservations(viewDateInput.value);
            } else {
                alert('Error al registrar: ' + result.message);
            }
        } catch (error) {
            console.error('Error al registrar la reservación:', error);
        }
    });

    viewDateInput.addEventListener('change', () => loadReservations(viewDateInput.value));

    document.addEventListener('click', async (e) => {
        if (e.target.closest('.table-box')) {
            const tableBox = e.target.closest('.table-box');
            const tableId = tableBox.dataset.tableId;
            const tableName = tableBox.querySelector('.table-name').textContent;
            if (!confirm(`¿Desea cambiar el estado de la ${tableName}?`)) return;
            try {
                const response = await fetch('/KitchenLink/src/api/update_table_status.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ table_id: tableId }) });
                const result = await response.json();
                if (result.success) {
                    loadTableStatuses();
                    fetchAvailableTablesForForm();
                } else {
                    alert("Error: " + result.message);
                }
            } catch (error) { 
                console.error('Error al actualizar estado:', error);
                alert("Error de conexión al actualizar el estado de la mesa.");
            }
        }
        
        if (e.target.closest('.details-toggle')) {
            const card = e.target.closest('.reservation-card');
            const details = card.querySelector('.reservation-details');
            const icon = card.querySelector('.details-toggle i');
            const isVisible = details.style.display === 'block';
            details.style.display = isVisible ? 'none' : 'block';
            icon.className = isVisible ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
        }

        const confirmButton = e.target.closest('.btn-confirm');
        const cancelButton = e.target.closest('.btn-cancel');

        if (confirmButton || cancelButton) {
            const card = e.target.closest('.reservation-card');
            const reservationId = card.dataset.reservationId;
            const btnConfirm = card.querySelector('.btn-confirm');
            const btnCancel = card.querySelector('.btn-cancel');
            
            let action = confirmButton ? 'confirmar la llegada del cliente' : 'CANCELAR esta reservación';
            let status = confirmButton ? 'completada' : 'cancelada';

            if (confirm(`¿Está seguro de que desea ${action}?`)) {
                btnConfirm.classList.add('processing');
                btnCancel.classList.add('processing');
                btnConfirm.disabled = true;
                btnCancel.disabled = true;

                const success = await archiveReservationAPI(reservationId, status);

                if (success) {
                    loadReservations(viewDateInput.value);
                    loadTableStatuses();
                    fetchAvailableTablesForForm();
                } else {
                    btnConfirm.classList.remove('processing');
                    btnCancel.classList.remove('processing');
                    btnConfirm.disabled = false;
                    btnCancel.disabled = false;
                }
            }
        }
    });

    // --- 4. INICIALIZACIÓN ---
    const todayDate = new Date();
    const year = todayDate.getFullYear();
    const month = String(todayDate.getMonth() + 1).padStart(2, '0');
    const day = String(todayDate.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    dateInput.value = today;
    viewDateInput.value = today;
    dateInput.min = today;
    
    loadTableStatuses();
    loadReservations(today);
    fetchAvailableTablesForForm();
    
    // --- 5. TEMPORIZADOR AUTOMÁTICO DE LIMPIEZA ---
    const cleanupInterval = 5 * 60 * 1000; 
    setInterval(async () => {
        try {
            console.log("Ejecutando limpieza automática de mesas... " + new Date().toLocaleTimeString());
            await fetch('/KitchenLink/src/api/cleanup_tables.php');
            await loadTableStatuses();
        } catch (error) {
            console.error("Error durante la limpieza automática:", error);
        }
    }, cleanupInterval);
});