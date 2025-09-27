/**
 * Este script gestiona la página de Reservaciones de KitchenLink.
 * Se encarga de tres áreas principales:
 * 1. El formulario para crear nuevas reservaciones.
 * 2. La visualización del estado actual de todas las mesas.
 * 3. La lista de reservaciones existentes para una fecha seleccionada.
 * Incluye validaciones, comunicación con el backend y una limpieza automática.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SELECCIÓN DE ELEMENTOS DEL DOM ---
    // Guardamos referencias a todos los elementos interactivos de la página para un acceso rápido.
    
    // Elementos del formulario de nueva reservación
    const reservaForm = document.getElementById('reservaForm');
    const dateInput = reservaForm.querySelector('input[name="reservation_date"]');
    const timeInput = reservaForm.querySelector('input[name="reservation_time"]');
    const numPersonasInput = reservaForm.querySelector('input[name="number_of_people"]');
    const nombreClienteInput = reservaForm.querySelector('input[name="customer_name"]');
    const telClienteInput = reservaForm.querySelector('input[name="customer_phone"]');
    const tableSelectorContainer = document.getElementById('tableSelectorContainer'); // Div donde se muestran las mesas disponibles para SELECCIONAR.
    const hiddenTableInputsContainer = document.getElementById('hiddenTableInputs'); // Div para guardar los inputs ocultos de las mesas seleccionadas.
    
    // Elementos de la vista de estado de mesas y lista de reservaciones
    const tableGrid = document.getElementById('tableGrid'); // Contenedor que muestra el estado de TODAS las mesas.
    const viewDateInput = document.getElementById('viewDate'); // Input de fecha para FILTRAR la lista de reservaciones.
    const reservationsList = document.getElementById('reservationsList'); // Contenedor para mostrar las tarjetas de las reservaciones.

    // --- 2. FUNCIONES DE VALIDACIÓN Y ASÍNCRONAS ---

    /**
     * Valida la lógica de negocio para una nueva reservación antes de enviarla al servidor.
     * @returns {boolean} - Devuelve true si la validación es exitosa, de lo contrario false.
     */
    function validateReservationLogic() {
        const selectedDate = dateInput.value;
        const selectedTime = timeInput.value;
        
        // Creamos un objeto Date completo para poder compararlo con la fecha y hora actuales.
        const reservationDateTime = new Date(`${selectedDate}T${selectedTime}`);
        const now = new Date();

        // Comprobamos si la fecha y hora de la reservación ya pasaron (con un margen de 1 minuto).
        if (reservationDateTime < (now - 60000)) {
            alert('Error: No se puede reservar en una fecha u hora que ya ha pasado.');
            return false;
        }

        // Validamos que la hora de la reservación esté dentro del horario de operación (8:00 AM a 10:59 PM).
        const hour = parseInt(selectedTime.split(':')[0]);
        if (hour < 8 || hour > 22) {
            alert('Error: Las reservaciones solo están disponibles de 8:00 AM a 10:00 PM.');
            return false;
        }

        return true; // Si pasa todas las validaciones, retorna true.
    }

    /**
     * @description Carga el estado actual de TODAS las mesas (disponible, ocupada, reservada) y las muestra en la cuadrícula.
     */
    async function loadTableStatuses() {
        try {
            const response = await fetch('/KitchenLink/src/api/get_table_status.php');
            const tables = await response.json();
            tableGrid.innerHTML = ''; // Limpiamos la vista actual.
            tables.forEach(table => {
                const tableBox = document.createElement('div');
                // Asignamos una clase CSS dinámica según el estado de la mesa para darle color.
                tableBox.className = `table-box ${table.status}`;
                tableBox.dataset.tableId = table.id; // Guardamos su ID para futuras interacciones.
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

    /**
     * @description Busca y muestra únicamente las mesas DISPONIBLES para una fecha y hora específicas en el formulario de nueva reservación.
     */
    async function fetchAvailableTablesForForm() {
        const date = dateInput.value;
        const time = timeInput.value;
        // Limpiamos selecciones previas.
        tableSelectorContainer.innerHTML = '<span style="color: #999; font-size: 14px; align-self: center;">Seleccione fecha y hora...</span>';
        hiddenTableInputsContainer.innerHTML = '';
        
        // Si no se ha seleccionado fecha y hora, no hacemos la búsqueda.
        if (!date || !time) return;

        try {
            // Hacemos la petición a la API enviando fecha y hora como parámetros en la URL.
            const response = await fetch(`/KitchenLink/src/api/get_available_tables.php?date=${date}&time=${time}`);
            const tables = await response.json();
            tableSelectorContainer.innerHTML = '';
            if (tables.length > 0) {
                // Si hay mesas disponibles, creamos los botones para seleccionarlas.
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

    /**
     * @description Carga la lista de reservaciones para una fecha específica y las muestra como tarjetas.
     * @param {string} date - La fecha en formato YYYY-MM-DD.
     */
    async function loadReservations(date) {
        if (!date) return;
        try {
            reservationsList.innerHTML = '<p>Cargando...</p>';
            const response = await fetch(`/KitchenLink/src/api/get_reservations.php?date=${date}`);
            const reservations = await response.json();
            reservationsList.innerHTML = '';
            if (reservations.length > 0) {
                // Por cada reservación, creamos una tarjeta HTML con sus datos y botones de acción.
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
    
    /**
     * @description Función reutilizable para enviar una petición a la API para archivar (confirmar o cancelar) una reservación.
     * @param {number} reservationId - El ID de la reservación a modificar.
     * @param {string} status - El nuevo estado ('completada' o 'cancelada').
     * @returns {Promise<boolean>} - Devuelve true si la operación fue exitosa.
     */
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

    // Validaciones en tiempo real para los campos del formulario.
    const allowOnlyNumbers = (e) => { e.target.value = e.target.value.replace(/[^0-9]/g, ''); };
    numPersonasInput.addEventListener('input', allowOnlyNumbers);
    telClienteInput.addEventListener('input', allowOnlyNumbers);
    nombreClienteInput.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, ''); });
    
    // Límites de longitud para evitar entradas excesivas.
    telClienteInput.addEventListener('input', (e) => { if (e.target.value.length > 10) e.target.value = e.target.value.slice(0, 10); });
    numPersonasInput.addEventListener('input', (e) => { if (e.target.value.length > 2) e.target.value = e.target.value.slice(0, 2); });

    // Cuando el usuario cambia la fecha o la hora, se vuelve a buscar qué mesas están disponibles.
    dateInput.addEventListener('change', fetchAvailableTablesForForm);
    timeInput.addEventListener('change', fetchAvailableTablesForForm);

    // Maneja la selección de mesas en el formulario.
    tableSelectorContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('table-option')) {
            const tableButton = e.target;
            const tableId = tableButton.dataset.tableId;
            tableButton.classList.toggle('selected'); // Cambia el estilo visual del botón.
            
            // Si el botón ahora está seleccionado, crea un input oculto con su ID.
            if (tableButton.classList.contains('selected')) {
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'table_ids[]'; // El `[]` permite enviar un array de IDs al backend.
                hiddenInput.value = tableId;
                hiddenInput.id = `table-input-${tableId}`;
                hiddenTableInputsContainer.appendChild(hiddenInput);
            } else { // Si se deselecciona, busca y elimina el input oculto correspondiente.
                const inputToRemove = document.getElementById(`table-input-${tableId}`);
                if (inputToRemove) inputToRemove.remove();
            }
        }
    });

    // Maneja el envío del formulario de nueva reservación.
    reservaForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que la página se recargue.
        
        // Primero, ejecuta las validaciones de lógica de negocio.
        if (!validateReservationLogic()) {
            return; // Si la validación falla, detiene el proceso.
        }

        const formData = new FormData(reservaForm);
        // Verifica que se haya seleccionado al menos una mesa.
        if (!formData.has('table_ids[]')) {
            alert('Por favor, seleccione al menos una mesa.');
            return;
        }

        try {
            const response = await fetch('/KitchenLink/src/api/add_reservation.php', { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                alert('¡Reservación registrada con éxito!');
                reservaForm.reset(); // Limpia el formulario.
                hiddenTableInputsContainer.innerHTML = ''; // Limpia los inputs ocultos.
                // Recarga las vistas para reflejar la nueva reservación.
                fetchAvailableTablesForForm();
                loadReservations(viewDateInput.value);
            } else {
                alert('Error al registrar: ' + result.message);
            }
        } catch (error) {
            console.error('Error al registrar la reservación:', error);
        }
    });

    // Cuando el usuario cambia la fecha de visualización, se recarga la lista de reservaciones.
    viewDateInput.addEventListener('change', () => loadReservations(viewDateInput.value));

    /**
     * Listener global que maneja clics en elementos dinámicos (delegación de eventos).
     * Esto es más eficiente que añadir un listener a cada botón o tarjeta individualmente.
     */
    document.addEventListener('click', async (e) => {
        // --- 1. Clic en una mesa de la cuadrícula de estado ---
        if (e.target.closest('.table-box')) {
            const tableBox = e.target.closest('.table-box');
            // Lógica para cambiar manualmente el estado de una mesa.
            // ... (código para actualizar estado de la mesa) ...
        }
        
        // --- 2. Clic en el botón para expandir/colapsar detalles de una reservación ---
        if (e.target.closest('.details-toggle')) {
            const card = e.target.closest('.reservation-card');
            const details = card.querySelector('.reservation-details');
            const icon = card.querySelector('.details-toggle i');
            const isVisible = details.style.display === 'block';
            details.style.display = isVisible ? 'none' : 'block'; // Muestra u oculta los detalles.
            icon.className = isVisible ? 'fas fa-chevron-down' : 'fas fa-chevron-up'; // Cambia el icono de la flecha.
        }

        // --- 3. Clic en los botones de 'Confirmar' o 'Cancelar' de una reservación ---
        const confirmButton = e.target.closest('.btn-confirm');
        const cancelButton = e.target.closest('.btn-cancel');

        if (confirmButton || cancelButton) {
            const card = e.target.closest('.reservation-card');
            const reservationId = card.dataset.reservationId;
            const [btnConfirm, btnCancel] = [card.querySelector('.btn-confirm'), card.querySelector('.btn-cancel')];
            
            // Define el mensaje y el estado según el botón presionado.
            let action = confirmButton ? 'confirmar la llegada del cliente' : 'CANCELAR esta reservación';
            let status = confirmButton ? 'completada' : 'cancelada';

            if (confirm(`¿Está seguro de que desea ${action}?`)) {
                // Deshabilita los botones para evitar doble clic.
                btnConfirm.classList.add('processing');
                btnCancel.classList.add('processing');
                btnConfirm.disabled = true;
                btnCancel.disabled = true;

                // Llama a la función que se comunica con la API.
                const success = await archiveReservationAPI(reservationId, status);

                if (success) {
                    // Si la operación tuvo éxito, recarga todas las vistas para reflejar los cambios.
                    loadReservations(viewDateInput.value);
                    loadTableStatuses();
                    fetchAvailableTablesForForm();
                } else {
                    // Si falló, reactiva los botones.
                    btnConfirm.classList.remove('processing');
                    btnCancel.classList.remove('processing');
                    btnConfirm.disabled = false;
                    btnCancel.disabled = false;
                }
            }
        }
    });

    // --- 4. INICIALIZACIÓN ---
    // Código que se ejecuta una sola vez cuando la página termina de cargar.
    const todayDate = new Date();
    // Formatea la fecha de hoy a 'YYYY-MM-DD' para los inputs de tipo 'date'.
    const year = todayDate.getFullYear();
    const month = String(todayDate.getMonth() + 1).padStart(2, '0'); // `padStart` asegura que tenga 2 dígitos (ej: 09).
    const day = String(todayDate.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    // Establece la fecha de hoy por defecto en ambos selectores de fecha.
    dateInput.value = today;
    viewDateInput.value = today;
    dateInput.min = today; // Evita que el usuario seleccione una fecha pasada en el calendario.
    
    // Carga los datos iniciales de la página.
    loadTableStatuses();
    loadReservations(today);
    fetchAvailableTablesForForm();
    
    // --- 5. TEMPORIZADOR AUTOMÁTICO DE LIMPIEZA ---
    // Establece un intervalo que se ejecutará periódicamente en segundo plano.
    const cleanupInterval = 5 * 60 * 1000; // 5 minutos en milisegundos.
    setInterval(async () => {
        try {
            console.log("Ejecutando limpieza automática de mesas... " + new Date().toLocaleTimeString());
            // Llama a un script en el backend que libera mesas de reservaciones muy antiguas que pudieron quedar "atascadas".
            await fetch('/KitchenLink/src/api/cleanup_tables.php');
            await loadTableStatuses(); // Recarga la vista de mesas después de la limpieza.
        } catch (error) {
            console.error("Error durante la limpieza automática:", error);
        }
    }, cleanupInterval);
});